const Booking = require("../models/bookings");
const Doctor = require("../models/doctors");

// 1. Hiển thị lịch khám của bác sĩ kèm thông tin bệnh nhân và khung giờ
const getBookingsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const bookings = await Booking.find(
      { "doctor.doctorId": doctorId },
      {
        status: 1,
        createdAt: 1,
        "patient.fullName": 1,
        "patient.phone": 1,
        "patient.email": 1,
        "doctor.slot.slotDate": 1,
        "doctor.slot.startTime": 1,
        "doctor.slot.endTime": 1,
        "payment.isSuccessful": 1,
        "payment.amount": 1,
      },
    ).sort({ "doctor.slot.slotDate": 1, "doctor.slot.startTime": 1 });

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch khám nào cho bác sĩ này",
      });
    }

    res
      .status(200)
      .json({ success: true, total: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//2. Danh sách bệnh nhân gần tới ngày đặt lịch khám (trong vòng 24h)
const getUpcomingBookings = async (req, res) => {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      status: { $in: ["confirmed", "pending_payment"] },
      "doctor.slot.slotDate": { $gte: now, $lte: next24h },
    });

    res.status(200).json({
      success: true,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Thống kê số lượng bệnh nhân mới theo ngày (đặt lịch lần đầu)
const getNewPatientsPerDay = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      { $sort: { createdAt: 1 } },
      // Lấy lần đặt lịch đầu tiên của mỗi bệnh nhân
      {
        $group: {
          _id: "$patient.userId",
          firstBookingDate: { $first: "$createdAt" },
          patientName: { $first: "$patient.fullName" },
        },
      },
      // Group theo ngày
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$firstBookingDate" },
          },
          newPatients: { $sum: 1 },
          patients: { $push: "$patientName" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", newPatients: 1, patients: 1 } },
    ]);

    res.status(200).json({ success: true, total: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
//
const parseSlotDateTime = (slotDate, startTime) => {
  const date = new Date(slotDate);
  const [hours, minutes] = startTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const canViewBooking = (req, booking) => {
  if (!req.user) return false;
  if (req.user.role === "doctor") return true;
  if (req.user.role === "patient") {
    return booking.patient.userId.toString() === req.user.id;
  }
  return false;
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch khám" });
    }

    if (!canViewBooking(req, booking)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Lấy thêm thông tin chuyên khoa từ Doctor
    const Doctor = require("../models/doctors.js");
    const doctor = await Doctor.findById(booking.doctor.doctorId, {
      specialty: 1,
    });

    res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        status: booking.status,
        createdAt: booking.createdAt,
        patient: booking.patient,
        doctor: {
          ...booking.doctor.toObject(),
          specialty: doctor?.specialty || null,
        },
        payment: booking.payment,
        medicalRecord: booking.medicalRecord,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Bệnh nhân với số lần đặt lịch >= 2
const getRepeatPatients = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      {
        $group: {
          _id: "$patient.userId",
          patientName: { $first: "$patient.fullName" },
          email: { $first: "$patient.email" },
          phone: { $first: "$patient.phone" },
          totalBookings: { $sum: 1 },
        },
      },
      { $match: { totalBookings: { $gte: 2 } } },
      { $sort: { totalBookings: -1 } },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          patientName: 1,
          email: 1,
          phone: 1,
          totalBookings: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, total: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 14. Thống kê số lượng lịch khám theo từng trạng thái (dashboard)
const getBookingStatsByStatus = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Đảm bảo đủ 4 trạng thái dù không có data
    const statusList = [
      "pending_payment",
      "confirmed",
      "completed",
      "cancelled",
      "reschedule_request",
      "no_show",
    ];
    const statsMap = Object.fromEntries(result.map((r) => [r._id, r.count]));
    const data = statusList.map((s) => ({
      status: s,
      count: statsMap[s] || 0,
    }));
    const total = data.reduce((sum, r) => sum + r.count, 0);

    res.status(200).json({ success: true, total, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 20. cập nhật trạng thái booking sang "reschedule_request" khi bệnh nhân yêu cầu đổi lịch
// const updateBookingToRescheduleRequest = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Không tìm thấy booking" });
//     }

//     if (booking.status === "completed" || booking.status === "cancelled") {
//       return res.status(400).json({
//         success: false,
//         message: "Không thể đổi lịch với booking đã hoàn tất hoặc đã hủy",
//       });
//     }

//     if (req.user.role === "patient") {
//       if (booking.patient.userId.toString() !== req.user.id) {
//         return res.status(403).json({ success: false, message: "Forbidden" });
//       }
//     }

//     booking.status = "reschedule_request";
//     await booking.save();

//     res.status(200).json({
//       success: true,
//       message: "Booking đã được cập nhật sang yêu cầu đổi lịch",
//       data: booking,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const updateBookingToRescheduleRequest = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    // ❌ Không cho đổi nếu đã xong hoặc hủy
    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Không thể đổi lịch với booking đã hoàn tất hoặc đã hủy",
      });
    }

    // 🔐 Check quyền
    if (req.user.role === "patient") {
      if (booking.patient.userId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    // 📥 Lấy slot mới từ request
    const { newSlotId, newSlotDate, startTime, endTime } = req.body;

    if (!newSlotId || !newSlotDate) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin slot mới",
      });
    }

    // 🚨 (QUAN TRỌNG) kiểm tra slot mới có tồn tại & active không
    const doctor = await Doctor.findOne({
      _id: booking.doctor.doctorId,
      "timeSlots._id": newSlotId,
      "timeSlots.isActive": true,
    });

    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: "Slot không hợp lệ hoặc không hoạt động",
      });
    }

    // 🔄 Cập nhật slot mới
    booking.doctor.slot = {
      slotId: newSlotId,
      slotDate: newSlotDate,
      startTime,
      endTime,
    };

    // 🔄 đổi trạng thái
    booking.status = "reschedule_request"; // hoặc vẫn giữ reschedule_request nếu cần duyệt

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Đổi lịch thành công",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRevenueByDateRange = async (req, res) => {
  try {
    const { from, to } = req.query;

    const match = { "payment.isSuccessful": true };

    if (from || to) {
      match["payment.paymentDate"] = {};
      if (from) match["payment.paymentDate"]["$gte"] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setDate(toDate.getDate() + 1); // include ngày to
        match["payment.paymentDate"]["$lt"] = toDate;
      }
    }

    const result = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$payment.amount" },
          totalBookings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalBookings: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      from: from || "không giới hạn",
      to: to || "không giới hạn",
      data: result[0] || { totalRevenue: 0, totalBookings: 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// 3.	Xóa những bệnh nhân đặt lịch (booking) nhưng mà không đi khám (đã quá giờ)
const deleteExpiredNoShowBookings = async (req, res) => {
  try {
    const now = new Date();
    const candidateBookings = await Booking.find({
      status: { $in: ["confirmed", "pending_payment"] },
      "doctor.slot.slotDate": { $lte: now },
    });

    const expiredIds = candidateBookings
      .filter((booking) => {
        const slotDateTime = parseSlotDateTime(
          booking.doctor.slot.slotDate,
          booking.doctor.slot.startTime,
        );
        return slotDateTime < now;
      })
      .map((booking) => booking._id);

    if (!expiredIds.length) {
      return res.status(200).json({
        success: true,
        deletedCount: 0,
        message: "Không có booking quá giờ cần xóa",
      });
    }

    const result = await Booking.deleteMany({ _id: { $in: expiredIds } });
    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      deletedIds: expiredIds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBookingsByDoctor,
  getUpcomingBookings,
  getNewPatientsPerDay,
  getBookingById,
  getRepeatPatients,
  getBookingStatsByStatus,
  getRevenueByDateRange,
  updateBookingToRescheduleRequest,
  deleteExpiredNoShowBookings,
};
