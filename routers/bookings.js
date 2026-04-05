const express = require("express");
const router = express.Router();
const {
  getBookingsByDoctor,
  getUpcomingBookings,
  getNewPatientsPerDay,
  getBookingById,
  getRepeatPatients,
  getBookingStatsByStatus,
  getRevenueByDateRange,
  updateBookingToRescheduleRequest,
  deleteExpiredNoShowBookings,
} = require("../controllers/bookingsController");
const { verifyToken } = require("../middleware/verifyToken");
const { authorizeRoles } = require("../middleware/authorizeRoles");

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Lịch khám và báo cáo booking
 */

/**
 * @swagger
 * /api/bookings/doctor/{doctorId}:
 *   get:
 *     summary: Hiển thị lịch khám của bác sĩ
 *     tags: [Bookings]
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
 *         description: Danh sách booking của bác sĩ
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */




// 1. Hiển thị lịch khám kèm thông tin bệnh nhân và bác sĩ (doctor only)
router.get(
  "/doctor/:doctorId",
  verifyToken,
  authorizeRoles("doctor"),
  getBookingsByDoctor,
);


/**
 * @swagger
 * /api/bookings/upcoming:
 *   get:
 *     summary: Danh sách bệnh nhân trong 24h tới
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách booking sắp tới
 */
// 2. Danh sách bệnh nhân gần tới ngày đặt lịch (trong 24h) (doctor only)
router.get(
  "/upcoming",
  verifyToken,
  authorizeRoles("doctor"),
  getUpcomingBookings,
);

/**
 * @swagger
 * /api/bookings/new-patients:
 *   get:
 *     summary: Tổng số bệnh nhân mới theo ngày
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê bệnh nhân mới
 */
// 5. Tổng số bệnh nhân mới theo ngày (đặt lịch lần đầu) (doctor only)
router.get(
  "/new-patients",
  verifyToken,
  authorizeRoles("doctor"),
  getNewPatientsPerDay,
);

/**
 * @swagger
 * /api/bookings/repeat-patients:
 *   get:
 *     summary: Bệnh nhân với số lần đặt lịch >= 2
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bệnh nhân quay lại
 */
// 10. Bệnh nhân với số lần đặt lịch >= 2 (doctor only)
router.get(
  "/repeat-patients",
  verifyToken,
  authorizeRoles("doctor"),
  getRepeatPatients,
);

/**
 * @swagger
 * /api/bookings/stats/status:
 *   get:
 *     summary: Thống kê lịch khám theo từng trạng thái
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê trạng thái booking
 */
// 14. Thống kê lịch khám theo từng trạng thái (dashboard) (doctor only)
router.get(
  "/stats/status",
  verifyToken,
  authorizeRoles("doctor"),
  getBookingStatsByStatus,
);

/**
 * @swagger
 * /api/bookings/revenue:
 *   get:
 *     summary: Tổng doanh thu từ lịch khám đã thanh toán
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Báo cáo doanh thu
 */
// 15. Tổng doanh thu từ lịch khám đã thanh toán trong khoảng thời gian (doctor only)
router.get(
  "/revenue",
  verifyToken,
  authorizeRoles("doctor"),
  getRevenueByDateRange,
);

/**
 * @swagger
 * /api/bookings/{id}/reschedule-request:
 *   put:
 *     summary: Cập nhật trạng thái booking thành yêu cầu đổi lịch
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Booking không tìm thấy
 */
// 20. Cập nhật trạng thái booking thành yêu cầu đổi lịch (patient hoặc doctor)
router.put(
  "/:id/reschedule-request",
  verifyToken,
  authorizeRoles("doctor", "patient"),
  updateBookingToRescheduleRequest,
);

/**
 * @swagger
 * /api/bookings/expired-no-show:
 *   delete:
 *     summary: Xóa các booking quá giờ nhưng không đi khám
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
// 3. Xóa các booking quá giờ nhưng không đi khám (doctor only)
router.delete(
  "/expired-no-show",
  verifyToken,
  authorizeRoles("doctor"),
  deleteExpiredNoShowBookings,
);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Chi tiết một lịch khám
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết booking
 *       404:
 *         description: Booking không tìm thấy
 */
// 9. Chi tiết một lịch khám — patient hoặc doctor
router.get("/:id", verifyToken, getBookingById);
module.exports = router;
