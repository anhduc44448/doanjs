const express = require("express");
const router = express.Router();
const {
  getBookingsByDoctor,
  getUpcomingBookings,
  getNewPatientsPerDay,
  getBookingById,
  getRepeatPatients,
  getBookingStatsByStatus,
} = require("../controllers/bookingsController");

// 1. Hiển thị lịch khám kèm thông tin bệnh nhân và bác sĩ
router.get("/doctor/:doctorId", getBookingsByDoctor);

// 2. Danh sách bệnh nhân gần tới ngày đặt lịch (trong 24h)
router.get("/upcoming", getUpcomingBookings);

// 5. Tổng số bệnh nhân mới theo ngày (đặt lịch lần đầu)
router.get("/new-patients", getNewPatientsPerDay);

// 10. Bệnh nhân với số lần đặt lịch >= 2
router.get("/repeat-patients", getRepeatPatients);

// 14. Thống kê lịch khám theo từng trạng thái (dashboard)
router.get("/stats/status", getBookingStatsByStatus);

// 9. Chi tiết một lịch khám — đặt cuối để không conflict với các route tĩnh trên
router.get("/:id", getBookingById);
module.exports = router;
