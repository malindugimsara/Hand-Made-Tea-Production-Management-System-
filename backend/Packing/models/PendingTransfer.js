import mongoose from "mongoose";

const pendingTransferSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  transferNo: { type: String, required: true },
  fromSection: { type: String, default: "Factory" },
  toSection: { type: String, default: "Packing" },
  grade: { type: String, required: true },
  teaType: { type: String, default: "" }, // අලුතින් එකතු කළ Field එක
  sentQtyKg: { type: Number, required: true },
  status: { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" },
  factoryUsername: { type: String }, // යැව්වේ කවුද
  acceptedBy: { type: String }, // Packing එකෙන් accept කරේ කවුද
  acceptedDate: { type: Date }
}, { timestamps: true });

export default mongoose.model("PendingTransfer", pendingTransferSchema);