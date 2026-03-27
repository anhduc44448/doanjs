const express = require("express");
const router = express.Router();
const {
  getAvgWorkingTimeByDoctor,
  getLowFrequencySlots,
  getBookingsBySpecialtyAndDate,
  getAvgRevenueByDoctor,
  getTop3Doctors,
  getDoctorRanking,
  getPeakSlots,
  getTopSpecialtyByRevenue,
} = require("../controllers/doctorsController");

// 6. Khung giờ tần suất đặt thấp (dưới 2) hoặc chưa từng được đặt
router.get("/low-slots", getLowFrequencySlots);

// 7. Lịch khám theo chuyên khoa và theo ngày
// VD: GET /api/doctors/bookings/filter?specialty=Tim mạch&date=2025-07-01
router.get("/bookings/filter", getBookingsBySpecialtyAndDate);

// 8. Doanh thu trung bình mỗi bác sĩ
router.get("/avg-revenue", getAvgRevenueByDoctor);

// 11. Top 3 bác sĩ có nhiều lịch khám nhất
router.get("/top3", getTop3Doctors);

// 12. Xếp hạng tất cả bác sĩ theo số lượng lịch khám
router.get("/ranking", getDoctorRanking);

// 13. Khung giờ cao điểm
// VD: GET /api/doctors/peak-slots?type=week
router.get("/peak-slots", getPeakSlots);

// 17. Top chuyên khoa doanh thu cao nhất theo tháng
// VD: GET /api/doctors/top-specialty?month=7&year=2025
router.get("/top-specialty", getTopSpecialtyByRevenue);

// 4. Thời gian làm việc trung bình hằng ngày của 1 bác sĩ
router.get("/:doctorId/working-time", getAvgWorkingTimeByDoctor);

module.exports = router;
