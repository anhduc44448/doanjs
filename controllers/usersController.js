const User = require("../models/users");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({
      fullName,
      email,
      phone,
      password,
      role,
    });

    await user.save();

    res.status(201).json({ message: "Register success", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "SECRET_KEY",
      {
        expiresIn: "1d",
      },
    );

    res.json({ message: "Login success", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Kiểm tra nếu user là doctor thì có thể xem tất cả, nếu là patient thì chỉ xem được thông tin của chính mình
const canAccessUser = (req, targetUserId) => {
  if (!req.user) return false;
  if (req.user.role === "doctor") return true;
  return req.user.id === targetUserId;
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 16. Lịch sử khám bệnh đầy đủ của một bệnh nhân (chẩn đoán + đơn thuốc + thanh toán)
const getPatientMedicalHistory = async (req, res) => {
  try {
    if (!canAccessUser(req, req.params.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const patientId = req.params.userId;
    const bookings = await require("../models/bookings")
      .find(
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
      )
      .sort({ "doctor.slot.slotDate": -1 });

    if (bookings.length === 0) {
      return res.status(404).json({ message: "Không có lịch sử khám bệnh" });
    }

    res
      .status(200)
      .json({ success: true, total: bookings.length, data: bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    if (!canAccessUser(req, req.params.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!canAccessUser(req, req.params.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updateData = { ...req.body };
    if (req.user.role !== "doctor") {
      delete updateData.role;
    }

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, {
      new: true,
    }).select("-password");

    res.json({ message: "Update success", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  getAllUsers,
  getUserById,
  updateUser,
  getPatientMedicalHistory,
  deleteUser,
};
