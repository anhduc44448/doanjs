const Booking = require("../models/bookings");
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

// 2. Danh sách bệnh nhân gần tới ngày đặt lịch khám (trong vòng 24h)
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

// 9. Chi tiết một lịch khám (đầy đủ: bệnh nhân, bác sĩ, chuyên khoa, thời gian, trạng thái, thanh toán)
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch khám" });
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

// 15. Tổng doanh thu từ lịch khám đã thanh toán trong khoảng thời gian
// Query: GET /api/bookings/revenue?from=2025-06-01&to=2025-06-30
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

// 16. Lịch sử khám bệnh đầy đủ của một bệnh nhân (chẩn đoán + đơn thuốc + thanh toán)
const getMedicalHistoryByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const bookings = await Booking.find(
      {
        "patient.userId": patientId,
        status: "completed",
      },
      {
        createdAt: 1,
        status: 1,
        "doctor.doctorId": 1,
        "doctor.userId": 1,
        "doctor.slot.slotDate": 1,
        "doctor.slot.startTime": 1,
        "doctor.slot.endTime": 1,
        "payment.amount": 1,
        "payment.isSuccessful": 1,
        "payment.paymentDate": 1,
        "medicalRecord.diagnosis": 1,
        "medicalRecord.prescription": 1,
        "medicalRecord.updatedDate": 1,
      },
    ).sort({ "doctor.slot.slotDate": -1 }); // mới nhất lên đầu

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không có lịch sử khám bệnh" });
    }

    res
      .status(200)
      .json({ success: true, total: bookings.length, data: bookings });
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
  getMedicalHistoryByPatient,
};
