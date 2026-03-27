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
module.exports = {
  getAvgWorkingTimeByDoctor,
  getLowFrequencySlots,
  getBookingsBySpecialtyAndDate,
  getAvgRevenueByDoctor,
  getTop3Doctors,
  getDoctorRanking,
  getPeakSlots,
  getTopSpecialtyByRevenue,
};
