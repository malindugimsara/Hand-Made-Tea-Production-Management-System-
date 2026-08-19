import mongoose from 'mongoose';

const witherLeafSchema = new mongoose.Schema({
  // --- Top Section ---
  factory: { 
    type: String, 
    required: true 
  },
  dateOfCrop: { 
    type: Date, 
    required: true 
  },
  receivedTotalCropKg: { 
    type: Number, 
    default: 0 
  },
  totalEmployee: { 
    type: Number, 
    default: 0 
  },
  dateOfManufactureTop: { 
    type: Date 
  },
  witheredLeafKgName1: { 
    type: Number, 
    default: 0 
  },
  name2: { 
    type: String 
  },
  percentage: { 
    type: Number, 
    default: 0 
  },

  // --- Middle Section (Time & Batching) ---
  startTime: { 
    type: String // e.g., "08:00"
  },
  finishTime: { 
    type: String // e.g., "16:00"
  },
  day: { 
    type: Date 
  },
  period: { 
    type: String 
  },
  noOfBatchers: { 
    type: Number, 
    default: 0 
  },
  weatheringQuality: { 
    type: String 
  },

  // --- Bottom Section (Quantities) ---
  dateOfManufactureBottom: { 
    type: Date 
  },
  // Represents the grid of 25 inputs
  quantities: [{
    columnNumber: { type: Number }, // 1 to 25
    value: { type: Number, default: 0 }
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

const WitherLeaf = mongoose.model('WitherLeaf', witherLeafSchema);

export default WitherLeaf;