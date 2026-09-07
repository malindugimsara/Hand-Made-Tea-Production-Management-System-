import mongoose from 'mongoose';

const tc5ReportSchema = new mongoose.Schema({
  month: { 
    type: String, 
    required: true, 
    unique: true 
  },
  section2_manufacture: {
    bf: { type: Number, default: 0 },
    ownLeaf: { type: Number, default: 0 },
    boughtLeaf: { type: Number, default: 0 },
    otherEstate: { type: Number, default: 0 },
    otherFactory: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    disposals: { type: Number, default: 0 },
    closing: { type: Number, default: 0 }
  },
  section3_averageLeaf: {
    best: { type: Number, default: 0 },
    below: { type: Number, default: 0 },
    poor: { type: Number, default: 0 }
  },
  section5_refuseTea: {
    bf: { type: Number, default: 0 },
    manufactured: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    manure: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  refuseBalance: { 
    type: Number, 
    default: 0 
  },
  section8_disposals: [{
    grade: { type: String },
    invoiceNos: { type: String },
    auction: { type: Number, default: 0 },
    private: { type: Number, default: 0 },
    forward: { type: Number, default: 0 },
    exFactory: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
    gifts: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }]
}, { timestamps: true });

export default mongoose.model('TC5Report', tc5ReportSchema);