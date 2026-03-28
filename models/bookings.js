const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  { _id: false },
);

const SlotSchema = new mongoose.Schema(
  {
    slotId: { type: mongoose.Schema.Types.ObjectId },
    slotDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
  },
  { _id: false },
);

const DoctorSnapshotSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    slot: { type: SlotSchema },
  },
  { _id: false },
);

const PaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number },
    appTransId: { type: String },
    zpTransToken: { type: String, default: null },
    zpTransId: { type: String, default: null },
    returnCode: { type: Number, default: null },
    responseMessage: { type: String, default: null },
    isSuccessful: { type: Boolean, default: false },
    paymentDate: { type: Date, default: null },
  },
  { _id: false },
);

const MedicalRecordSchema = new mongoose.Schema(
  {
    diagnosis: { type: String },
    prescription: { type: String },
    updatedDate: { type: Date },
  },
  { _id: false },
);

const BookingSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "pending_payment",
      "confirmed",
      "completed",
      "cancelled",
      "reschedule_request",
      "no_show",
    ],
    default: "pending_payment",
  },
  createdAt: { type: Date },
  patient: { type: PatientSchema },
  doctor: { type: DoctorSnapshotSchema },
  payment: { type: PaymentSchema },
  medicalRecord: { type: MedicalRecordSchema, default: null },
});

module.exports = mongoose.model("Booking", BookingSchema);
