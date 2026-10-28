import mongoose from 'mongoose';

const batchItemSchema = new mongoose.Schema({
  batchNo: {
    type: Number,
    required: true
  },
  dhool1: {
    roll01Start: { type: String, default: '' },
    roll01End: { type: String, default: '' },
    roll02Start: { type: String, default: '' },
    roll02End: { type: String, default: '' },
    wetDhoolKg: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  dhool2: {
    roll03Start: { type: String, default: '' },
    roll03End: { type: String, default: '' },
    roll04Start: { type: String, default: '' },
    roll04End: { type: String, default: '' },
    wetDhoolKg: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  }
}, { _id: false });

// 💡 Navin Hydro Meter Readings sathi schema
const hydroReadingSchema = new mongoose.Schema({
  time: { type: String, default: '' },
  dryBulb: { type: String, default: '' },
  wetBulb: { type: String, default: '' },
  difference: { type: String, default: '' }
}, { _id: false });

const rollingRoomSheetSchema = new mongoose.Schema({
  factory: {
    type: String,
    default: ''
  },
  cropDate: {
    type: String,
    required: true,
    index: true // Only declare index once here
  },
  mfDate: {
    type: String,
    required: true
  },
  cropKg: {
    type: Number,
    default: 0
  },
  otherLeafKg: {
    type: Number,
    default: 0
  },
  rollingStartTime: {
    type: String,
    default: ''
  },
  rollingEndTime: {
    type: String,
    default: ''
  },
  totalRollingHours: {
    type: String,
    default: ''
  },
  dayType: {
    type: String,
    enum: ['Same Day', 'Next Day'],
    default: 'Same Day'
  },
  noOfBatches: {
    type: Number,
    default: 1
  },
  standardBatchKg: {
    type: Number,
    default: 560
  },
  batches: [batchItemSchema],
  
  // 💡 Frontend madhun yenara hydroReadings array save karnyashati navin field
  hydroReadings: [hydroReadingSchema],

  enteredBy: {
    type: String,
    default: 'Admin'
  },
  createdBy: {
    type: String,
    default: 'Admin'
  },
  editedBy: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('RollingRoomSheet', rollingRoomSheetSchema);