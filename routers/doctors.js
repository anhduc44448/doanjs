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
  getSuggestedDoctors,
  checkSlotAvailability,
  getAvailableSlotsBySpecialtyAndDate,
} = require("../controllers/doctorsController");

// 6. Khung giờ tần suất đặt thấp (dưới 2) hoặc chưa từng được đặt
router.get("/low-slots", getLowFrequencySlots);

// 7. Lịch khám theo chuyên khoa và theo ngày
router.get("/bookings/filter", getBookingsBySpecialtyAndDate);

// 8. Doanh thu trung bình mỗi bác sĩ
router.get("/avg-revenue", getAvgRevenueByDoctor);

// 11. Top 3 bác sĩ có nhiều lịch khám nhất
router.get("/top3", getTop3Doctors);

// 12. Xếp hạng tất cả bác sĩ theo số lượng lịch khám
router.get("/ranking", getDoctorRanking);

// 13. Khung giờ cao điểm
router.get("/peak-slots", getPeakSlots);

// 17. Top chuyên khoa doanh thu cao nhất theo tháng
router.get("/top-specialty", getTopSpecialtyByRevenue);

// 18. Gợi ý bác sĩ cho bệnh nhân dựa trên lịch sử đặt khám
router.get("/:doctorId/suggested", getSuggestedDoctors);

//19. Kiểm tra tính khả dụng của khung giờ đặt khám
router.get("/:doctorId/check-slot", checkSlotAvailability);

// 20. Lấy danh sách khung giờ còn trống theo chuyên khoa và ngày
router.get("/available-slots", getAvailableSlotsBySpecialtyAndDate);

// 4. Thời gian làm việc trung bình hằng ngày của 1 bác sĩ
router.get("/:doctorId/working-time", getAvgWorkingTimeByDoctor);

module.exports = router;
