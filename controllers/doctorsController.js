const Doctor = require("../models/doctors");
const Booking = require("../models/bookings");

// 4. Thời gian làm việc trung bình hằng ngày của 1 bác sĩ
const getAvgWorkingTimeByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });
    }

    // Tính số phút mỗi slot, group theo ngày
    const minutesByDate = {};
    for (const slot of doctor.timeSlots) {
      if (!slot.isActive) continue;

      const dateKey = new Date(slot.slotDate).toISOString().split("T")[0];
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      const minutes = endH * 60 + endM - (startH * 60 + startM);

      minutesByDate[dateKey] = (minutesByDate[dateKey] || 0) + minutes;
    }

    const dates = Object.keys(minutesByDate);
    if (dates.length === 0) {
      return res
        .status(200)
        .json({ success: true, avgMinutesPerDay: 0, detail: {} });
    }

    const totalMinutes = Object.values(minutesByDate).reduce(
      (a, b) => a + b,
      0,
    );
    const avgMinutes = Math.round(totalMinutes / dates.length);

    res.status(200).json({
      success: true,
      doctorId,
      avgMinutesPerDay: avgMinutes,
      avgFormatted: `${Math.floor(avgMinutes / 60)} giờ ${avgMinutes % 60} phút`,
      detail: minutesByDate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Khung giờ có tần suất đặt lịch thấp (dưới 2) hoặc chưa từng được đặt
const getLowFrequencySlots = async (req, res) => {
  try {
    // Đếm số lần mỗi slot được đặt (chỉ tính booking active)
    const bookedSlots = await Booking.aggregate([
      {
        $match: {
          status: { $in: ["pending_payment", "confirmed", "completed"] },
        },
      },
      {
        $group: {
          _id: "$doctor.slot.slotId",
          count: { $sum: 1 },
        },
      },
    ]);

    const bookedMap = {};
    for (const b of bookedSlots) {
      if (b._id) bookedMap[b._id.toString()] = b.count;
    }

    // Duyệt tất cả slot từ doctors
    const doctors = await Doctor.find({});
    const lowSlots = [];

    for (const doctor of doctors) {
      for (const slot of doctor.timeSlots) {
        const count = bookedMap[slot._id.toString()] || 0;
        if (count < 2) {
          lowSlots.push({
            doctorId: doctor._id,
            slotId: slot._id,
            slotDate: slot.slotDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
            bookingCount: count,
          });
        }
      }
    }

    res
      .status(200)
      .json({ success: true, total: lowSlots.length, data: lowSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Lịch khám theo chuyên khoa và theo ngày
// Query: GET /api/doctors/bookings/filter?specialty=Tim mạch&date=2025-07-01
const getBookingsBySpecialtyAndDate = async (req, res) => {
  try {
    const { specialty, date } = req.query;

    const match = {};

    // Lọc theo ngày
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      match["doctor.slot.slotDate"] = { $gte: start, $lt: end };
    }

    // Lọc theo chuyên khoa — tìm doctorId có specialty khớp
    if (specialty) {
      const doctors = await Doctor.find(
        { "specialty.name": { $regex: specialty, $options: "i" } },
        { _id: 1 },
      );
      const doctorIds = doctors.map((d) => d._id);
      match["doctor.doctorId"] = { $in: doctorIds };
    }

    const bookings = await Booking.find(match).sort({
      "doctor.slot.slotDate": 1,
      "doctor.slot.startTime": 1,
    });

    res
      .status(200)
      .json({ success: true, total: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Doanh thu trung bình mỗi bác sĩ
const getAvgRevenueByDoctor = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { "payment.isSuccessful": true } },
      {
        $group: {
          _id: "$doctor.doctorId",
          totalRevenue: { $sum: "$payment.amount" },
          totalBookings: { $sum: 1 },
          avgRevenue: { $avg: "$payment.amount" },
        },
      },
      { $sort: { avgRevenue: -1 } },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          totalRevenue: 1,
          totalBookings: 1,
          avgRevenue: { $round: ["$avgRevenue", 0] },
        },
      },
    ]);

    res.status(200).json({ success: true, total: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Top 3 bác sĩ có nhiều lịch khám nhất
const getTop3Doctors = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$doctor.doctorId",
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: "$doctorInfo" },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          totalBookings: 1,
          specialty: "$doctorInfo.specialty.name",
          basePrice: "$doctorInfo.basePrice",
        },
      },
    ]);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 12. Xếp hạng tất cả bác sĩ theo số lượng lịch khám
const getDoctorRanking = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$doctor.doctorId",
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { totalBookings: -1 } },
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: "$doctorInfo" },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          totalBookings: 1,
          specialty: "$doctorInfo.specialty.name",
          basePrice: "$doctorInfo.basePrice",
        },
      },
    ]);

    // Gán thứ hạng
    const data = result.map((item, index) => ({ rank: index + 1, ...item }));

    res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 13. Khung giờ cao điểm có nhiều lượt đặt nhất trong ngày hoặc trong tuần
// Query: GET /api/doctors/peak-slots?type=day   (hoặc type=week)
const getPeakSlots = async (req, res) => {
  try {
    const { type = "day" } = req.query; // "day" hoặc "week"

    const groupId =
      type === "week"
        ? {
            dayOfWeek: { $dayOfWeek: "$doctor.slot.slotDate" },
            startTime: "$doctor.slot.startTime",
          }
        : { startTime: "$doctor.slot.startTime" };

    const result = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          startTime: "$_id.startTime",
          dayOfWeek: "$_id.dayOfWeek", // 1=CN, 2=T2 ... 7=T7 (MongoDB convention)
          count: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, type, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 17. Top chuyên khoa có doanh thu cao nhất theo tháng
// Query: GET /api/doctors/top-specialty?month=7&year=2025
const getTopSpecialtyByRevenue = async (req, res) => {
  try {
    const { month, year } = req.query;

    const matchStage = { "payment.isSuccessful": true };

    if (month && year) {
      const start = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      matchStage["payment.paymentDate"] = { $gte: start, $lt: end };
    }

    const result = await Booking.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "doctors",
          localField: "doctor.doctorId",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: "$doctorInfo" },
      {
        $group: {
          _id: "$doctorInfo.specialty.name",
          totalRevenue: { $sum: "$payment.amount" },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          _id: 0,
          specialty: "$_id",
          totalRevenue: 1,
          totalBookings: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, month, year, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 18. Gợi ý bác sĩ cùng chuyên khoa nhưng khác khung giờ (khi slot bị kín)
// GET /api/doctors/:doctorId/suggest?slotDate=2025-07-01&startTime=08:30
const getSuggestedDoctors = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { slotDate, startTime } = req.query;

    if (!slotDate || !startTime) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu slotDate hoặc startTime" });
    }

    const currentDoctor = await Doctor.findById(doctorId);
    if (!currentDoctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });
    }

    const specialtyName = currentDoctor.specialty.name;
    const date = new Date(slotDate);
    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    // Bác sĩ cùng chuyên khoa, khác bác sĩ hiện tại
    const sameDoctors = await Doctor.find({
      _id: { $ne: doctorId },
      "specialty.name": specialtyName,
    });

    // Slot đã bị đặt trong ngày đó
    const bookedBookings = await Booking.find(
      {
        status: { $in: ["pending_payment", "confirmed"] },
        "doctor.slot.slotDate": { $gte: date, $lt: nextDay },
      },
      { "doctor.slot.slotId": 1 },
    );
    const bookedSlotIds = bookedBookings.map((b) =>
      b.doctor.slot.slotId.toString(),
    );

    // Lọc slot còn trống và khác giờ bị kín
    const suggestions = [];
    for (const doctor of sameDoctors) {
      const availableSlots = doctor.timeSlots.filter((slot) => {
        const sameDay =
          new Date(slot.slotDate).toISOString().split("T")[0] === slotDate;
        const notBooked = !bookedSlotIds.includes(slot._id.toString());
        const diffTime = slot.startTime !== startTime;
        return sameDay && notBooked && diffTime && slot.isActive;
      });

      if (availableSlots.length > 0) {
        suggestions.push({
          doctorId: doctor._id,
          specialty: doctor.specialty.name,
          basePrice: doctor.basePrice,
          availableSlots: availableSlots.map((s) => ({
            slotId: s._id,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    }

    res
      .status(200)
      .json({ success: true, total: suggestions.length, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 19. Kiểm tra 1 khung giờ cụ thể của bác sĩ đã được đặt chưa
// GET /api/doctors/:doctorId/check-slot?slotId=665f000000000000000a0001
const checkSlotAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { slotId } = req.query;

    if (!slotId) {
      return res.status(400).json({ success: false, message: "Thiếu slotId" });
    }

    // Kiểm tra slot có tồn tại trong doctor không
    const doctor = await Doctor.findOne(
      { _id: doctorId, "timeSlots._id": slotId },
      { "timeSlots.$": 1 },
    );

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy slot" });
    }

    const slot = doctor.timeSlots[0];

    // Kiểm tra slot đã bị đặt chưa (booking còn hiệu lực)
    const existingBooking = await Booking.findOne({
      "doctor.slot.slotId": slotId,
      status: { $in: ["pending_payment", "confirmed"] },
    });

    res.status(200).json({
      success: true,
      slotId,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
      isBooked: !!existingBooking,
      status: existingBooking ? existingBooking.status : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 21. Lịch rảnh của bác sĩ theo chuyên khoa và theo ngày
// GET /api/doctors/available-slots?specialty=Tim mạch&date=2025-07-01
const getAvailableSlotsBySpecialtyAndDate = async (req, res) => {
  try {
    const { specialty, date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: "Thiếu date" });
    }

    const query = specialty
      ? { "specialty.name": { $regex: specialty, $options: "i" } }
      : {};
    const doctors = await Doctor.find(query);

    const targetDate = new Date(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Slot đã bị đặt trong ngày đó
    const bookedBookings = await Booking.find(
      {
        status: { $in: ["pending_payment", "confirmed"] },
        "doctor.slot.slotDate": { $gte: targetDate, $lt: nextDay },
      },
      { "doctor.slot.slotId": 1 },
    );
    const bookedSlotIds = bookedBookings.map((b) =>
      b.doctor.slot.slotId.toString(),
    );

    // Lọc slot rảnh
    const result = [];
    for (const doctor of doctors) {
      const freeSlots = doctor.timeSlots.filter((slot) => {
        const sameDay =
          new Date(slot.slotDate).toISOString().split("T")[0] === date;
        const notBooked = !bookedSlotIds.includes(slot._id.toString());
        return sameDay && notBooked && slot.isActive;
      });

      if (freeSlots.length > 0) {
        result.push({
          doctorId: doctor._id,
          specialty: doctor.specialty.name,
          basePrice: doctor.basePrice,
          freeSlots: freeSlots.map((s) => ({
            slotId: s._id,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    }

    res
      .status(200)
      .json({ success: true, date, total: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = {
  getAvgWorkingTimeByDoctor,
  getLowFrequencySlots,
  getBookingsBySpecialtyAndDate,
  getAvgRevenueByDoctor,
  getTop3Doctors,
  getDoctorRanking,
  getPeakSlots,
  getTopSpecialtyByRevenue,
  getSuggestedDoctors,
  checkSlotAvailability,
  getAvailableSlotsBySpecialtyAndDate,
};
