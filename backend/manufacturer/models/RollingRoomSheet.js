import mongoose from 'mongoose';

const STANDARD_BATCH_KG = 560;

// Sub-schema for individual Dhool Stages (1st Dhool, 2nd Dhool, Big Bulk)
const DhoolStageSchema = new mongoose.Schema({
  startTime: {
    type: String,
    default: '',
    trim: true
  },
  endTime: {
    type: String,
    default: '',
    trim: true
  },
  wetDhoolKg: {
    type: Number,
    default: 0,
    min: [0, 'Weight cannot be negative']
  },
  percentage: {
    type: Number,
    default: 0,
    min: [0, 'Percentage cannot be negative']
  }
}, { _id: false });

// Sub-schema for Batch Rows (Badge No 1, 2, 3...)
const BatchRowSchema = new mongoose.Schema({
  batchNo: {
    type: Number,
    required: [true, 'Batch number is required']
  },
  dhool1: {
    type: DhoolStageSchema,
    default: () => ({})
  },
  dhool2: {
    type: DhoolStageSchema,
    default: () => ({})
  },
  bigBulk: {
    type: DhoolStageSchema,
    default: () => ({})
  }
}, { _id: true });

// Main Rolling Room Sheet Schema
const RollingRoomSheetSchema = new mongoose.Schema({
  factory: {
    type: String,
    default: 'ATHUKORALA TEA FACTORY - MF1398',
    trim: true
  },
  cropDate: {
    type: String, // Format: YYYY-MM-DD
    required: [true, 'Crop date is required'],
    index: true
  },
  mfDate: {
    type: String, // Format: YYYY-MM-DD
    required: [true, 'M/F date is required'],
    index: true
  },
  cropKg: {
    type: Number,
    default: 0,
    min: [0, 'Crop weight cannot be negative']
  },
  otherLeafKg: {
    type: Number,
    default: 0,
    min: [0, 'Other leaf weight cannot be negative']
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
  batches: [BatchRowSchema],
  
  // Computed Summary Totals
  summary: {
    totalDhool1Kg: { type: Number, default: 0 },
    totalDhool2Kg: { type: Number, default: 0 },
    totalBigBulkKg: { type: Number, default: 0 },
    grandTotalWetDhoolKg: { type: Number, default: 0 },
    grandTotalPercentage: { type: Number, default: 0 }
  },
  
  createdBy: {
    type: String,
    default: 'Admin'
  },
  editedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Pre-save Hook: Enforce the formula % = (Wet Dhool Kg / 560) * 100 & calculate totals
RollingRoomSheetSchema.pre('save', function (next) {
  if (this.batches && this.batches.length > 0) {
    let sumD1 = 0;
    let sumD2 = 0;
    let sumBB = 0;

    this.batches.forEach(b => {
      // 1. Calculate percentage for each stage if Kg is provided
      if (b.dhool1?.wetDhoolKg) {
        b.dhool1.percentage = parseFloat(((b.dhool1.wetDhoolKg / STANDARD_BATCH_KG) * 100).toFixed(2));
        sumD1 += Number(b.dhool1.wetDhoolKg);
      }
      if (b.dhool2?.wetDhoolKg) {
        b.dhool2.percentage = parseFloat(((b.dhool2.wetDhoolKg / STANDARD_BATCH_KG) * 100).toFixed(2));
        sumD2 += Number(b.dhool2.wetDhoolKg);
      }
      if (b.bigBulk?.wetDhoolKg) {
        b.bigBulk.percentage = parseFloat(((b.bigBulk.wetDhoolKg / STANDARD_BATCH_KG) * 100).toFixed(2));
        sumBB += Number(b.bigBulk.wetDhoolKg);
      }
    });

    const grandTotalKg = sumD1 + sumD2 + sumBB;
    const totalCapacity = this.batches.length * STANDARD_BATCH_KG;
    const grandTotalPct = totalCapacity > 0 ? (grandTotalKg / totalCapacity) * 100 : 0;

    this.summary = {
      totalDhool1Kg: parseFloat(sumD1.toFixed(2)),
      totalDhool2Kg: parseFloat(sumD2.toFixed(2)),
      totalBigBulkKg: parseFloat(sumBB.toFixed(2)),
      grandTotalWetDhoolKg: parseFloat(grandTotalKg.toFixed(2)),
      grandTotalPercentage: parseFloat(grandTotalPct.toFixed(2))
    };

    this.noOfBatches = this.batches.length;
  }
  next();
});

const RollingRoomSheet = mongoose.models.RollingRoomSheet || mongoose.model('RollingRoomSheet', RollingRoomSheetSchema);

export default RollingRoomSheet;