import mongoose from 'mongoose';

const labourOutputSchema = new mongoose.Schema({
  date: {
    type: String, // Stored as YYYY-MM-DD
    required: true,
  },
  section: {
    type: String,
    required: true,
  },
  noOfLabours: {
    type: Number,
    required: true,
  },
  otHours: {
    type: Number,
    default: 0,
  },
  totalShifts: {
    type: Number,
    required: true,
  },
  labourOutput: {
    type: Number,
    required: true,
  },
  username: {
    type: String,
    required: true,
  }
}, { timestamps: true });


// Replace the bottom of your model file with this:
const LabourOutput = mongoose.models.LabourOutput || mongoose.model('LabourOutput', labourOutputSchema);
export default LabourOutput;