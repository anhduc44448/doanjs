const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const { verifyToken } = require("../middleware/verifyToken");

const { authorizeRoles } = require("../middleware/authorizeRoles");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User API
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Đăng ký user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             fullName: "Nguyen Van A"
 *             email: "a@gmail.com"
 *             phone: "0123456789"
 *             password: "123456"
 *             role: "patient"
 *     responses:
 *       201:
 *         description: Register success
 *       400:
 *         description: User already exists
 */
// ===== AUTH =====
router.post("/register", usersController.register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "a@gmail.com"
 *             password: "123456"
 *     responses:
 *       200:
 *         description: Login success
 *       404:
 *         description: User not found
 *       400:
 *         description: Wrong password
 */
router.post("/login", usersController.login);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Lấy thông tin user hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
// ===== PROFILE (ai login cũng xem được) =====
router.get("/profile", verifyToken, usersController.getProfile);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy tất cả user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Chỉ doctor mới được gọi endpoint này
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// ===== ADMIN / DOCTOR ONLY =====
router.get(
  "/",
  verifyToken,
  authorizeRoles("doctor"), // 🔥 chỉ doctor
  usersController.getAllUsers,
);

/**
 * @swagger
 * /api/users/{userId}/medical-history:
 *   get:
 *     summary: Lấy lịch sử khám bệnh của bệnh nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Patient chỉ xem được lịch sử của chính mình, doctor xem được tất cả.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Không có lịch sử khám bệnh
 */
// Patient / doctor có thể xem lịch sử khám bệnh của chính mình / bệnh nhân
router.get(
  "/:userId/medical-history",
  verifyToken,
  usersController.getPatientMedicalHistory,
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Lấy user theo ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Doctor có thể xem tất cả, patient chỉ xem chính mình
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get("/:userId", verifyToken, usersController.getUserById);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Cập nhật user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Doctor có thể cập nhật tất cả user, patient chỉ cập nhật chính mình
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             fullName: "Nguyen Van A"
 *             email: "a@gmail.com"
 *             phone: "0123456789"
 *     responses:
 *       200:
 *         description: Update success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put("/:userId", verifyToken, usersController.updateUser);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Xóa user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Chỉ doctor mới được gọi endpoint này
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delete success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete(
  "/:userId",
  verifyToken,
  authorizeRoles("doctor"), // 🔥 chỉ doctor
  usersController.deleteUser,
);

module.exports = router;
