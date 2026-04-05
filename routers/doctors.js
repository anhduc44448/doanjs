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
const { verifyToken } = require("../middleware/verifyToken");
const { authorizeRoles } = require("../middleware/authorizeRoles");

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: API cho bác sĩ và thống kê
 */

/**
 * @swagger
 * /api/doctors/{doctorId}/working-time:
 *   get:
 *     summary: Thời gian làm việc trung bình hằng ngày của 1 bác sĩ
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thời gian làm việc trung bình
 *       404:
 *         description: Không tìm thấy bác sĩ
 */

/**
 * @swagger
 * /api/doctors/low-slots:
 *   get:
 *     summary: Khung giờ có tần suất đặt thấp
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách khung giờ ít được đặt
 */
router.get(
  "/low-slots",
  verifyToken,
  authorizeRoles("doctor"),
  getLowFrequencySlots,
);

/**
 * @swagger
 * /api/doctors/bookings/filter:
 *   get:
 *     summary: Lịch khám theo chuyên khoa và ngày
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Danh sách booking theo bộ lọc
 */
// 7. Lịch khám theo chuyên khoa và theo ngày (doctor only)
router.get(
  "/bookings/filter",
  verifyToken,
  authorizeRoles("doctor"),
  getBookingsBySpecialtyAndDate,
);

/**
 * @swagger
 * /api/doctors/avg-revenue:
 *   get:
 *     summary: Doanh thu trung bình mỗi bác sĩ
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Báo cáo doanh thu trung bình
 */
// 8. Doanh thu trung bình mỗi bác sĩ (doctor only)
router.get(
  "/avg-revenue",
  verifyToken,
  authorizeRoles("doctor"),
  getAvgRevenueByDoctor,
);

/**
 * @swagger
 * /api/doctors/top3:
 *   get:
 *     summary: Top 3 bác sĩ có nhiều lịch khám nhất
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top 3 bác sĩ
 */
// 11. Top 3 bác sĩ có nhiều lịch khám nhất (doctor only)
router.get("/top3", verifyToken, authorizeRoles("doctor"), getTop3Doctors);

/**
 * @swagger
 * /api/doctors/ranking:
 *   get:
 *     summary: Xếp hạng bác sĩ theo số lượng lịch khám
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bảng xếp hạng bác sĩ
 */
// 12. Xếp hạng tất cả bác sĩ theo số lượng lịch khám (doctor only)
router.get("/ranking", verifyToken, authorizeRoles("doctor"), getDoctorRanking);

/**
 * @swagger
 * /api/doctors/peak-slots:
 *   get:
 *     summary: Top khung giờ cao điểm
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [day, week]
 *     responses:
 *       200:
 *         description: Top khung giờ cao điểm
 */
// 13. Khung giờ cao điểm (doctor only)
router.get("/peak-slots", verifyToken, authorizeRoles("doctor"), getPeakSlots);

/**
 * @swagger
 * /api/doctors/top-specialty:
 *   get:
 *     summary: Top chuyên khoa có doanh thu cao nhất
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Top chuyên khoa theo doanh thu
 */
// 17. Top chuyên khoa doanh thu cao nhất theo tháng (doctor only)
router.get(
  "/top-specialty",
  verifyToken,
  authorizeRoles("doctor"),
  getTopSpecialtyByRevenue,
);

/**
 * @swagger
 * /api/doctors/{doctorId}/suggested:
 *   get:
 *     summary: Gợi ý bác sĩ cùng chuyên khoa khác khung giờ
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: slotDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gợi ý bác sĩ
 */
// 18. Gợi ý bác sĩ cho bệnh nhân dựa trên lịch sử đặt khám
router.get(
  "/:doctorId/suggested",
  verifyToken,
  authorizeRoles("doctor", "patient"),
  getSuggestedDoctors,
);

/**
 * @swagger
 * /api/doctors/{doctorId}/check-slot:
 *   get:
 *     summary: Kiểm tra slot của bác sĩ đã bị đặt chưa
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trạng thái slot
 */
//19. Kiểm tra tính khả dụng của khung giờ đặt khám
router.get(
  "/:doctorId/check-slot",
  verifyToken,
  authorizeRoles("doctor", "patient"),
  checkSlotAvailability,
);

/**
 * @swagger
 * /api/doctors/available-slots:
 *   get:
 *     summary: Lấy khung giờ còn trống theo chuyên khoa và ngày
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Danh sách slot còn trống
 */
// 20. Lấy danh sách khung giờ còn trống theo chuyên khoa và ngày
router.get(
  "/available-slots",
  verifyToken,
  authorizeRoles("doctor", "patient"),
  getAvailableSlotsBySpecialtyAndDate,
);

// 4. Thời gian làm việc trung bình hằng ngày của 1 bác sĩ
router.get(
  "/:doctorId/working-time",
  verifyToken,
  authorizeRoles("doctor"),
  getAvgWorkingTimeByDoctor,
);

module.exports = router;
