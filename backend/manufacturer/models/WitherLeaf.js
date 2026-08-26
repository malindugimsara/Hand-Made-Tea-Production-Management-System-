import mongoose from 'mongoose';

const witherLeafSchema = new mongoose.Schema({
  factory: { type: String }, // <-- Removed required: true
  dateOfCrop: { type: String }, // <-- Removed required: true
  receivedTotalCropKg: { type: Number, default: 0 },
  totalEmployee: { type: Number, default: 0 },
  witheredLeafKg: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  name1: { type: String, default: "" },
  name2: { type: String, default: "" },
  dateOfManufacture: { type: String },
  startTime: { type: String },
  finishTime: { type: String },
  period: { type: String },
  day: { type: String },
  noOfBatchers: { type: Number, default: 0 },
  weatheringQuality: { type: String },
  batches: { type: [Number], default: () => Array(25).fill(0) }
}, {
  timestamps: true 
});

export default mongoose.model('WitherLeaf', witherLeafSchema);