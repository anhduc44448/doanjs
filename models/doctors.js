const mongoose = require("mongoose");

const SpecialtySchema = new mongoose.Schema(
  {
    specialtyId: { type: Number },
    name: { type: String },
  },
  { _id: false },
);

const TimeSlotSchema = new mongoose.Schema({
  slotDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  isActive: { type: Boolean, default: true },
});

const DoctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  experienceYears: { type: Number },
  basePrice: { type: Number, required: true },
  specialty: { type: SpecialtySchema },
  timeSlots: { type: [TimeSlotSchema], default: [] },
});

module.exports = mongoose.model("Doctor", DoctorSchema);
