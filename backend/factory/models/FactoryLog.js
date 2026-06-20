import mongoose from 'mongoose';

const factoryLogSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  greenLeaf: {
    today: { type: Number, default: 0 },
    toDate: { type: Number, default: 0 }
  },
  madeTea: {
    today: { type: Number, default: 0 },
    toDate: { type: Number, default: 0 }
  },
  dispatch: { type: Number, default: 0 },
  localSaleAndGratis: { type: Number, default: 0 },
  totalOut: { type: Number, default: 0 },
  returnAmount: { type: Number, default: 0 },
  bfBalance: { type: Number, default: 0 },
  factoryBalance: { type: Number, default: 0 },
  
  // --- ADDED FOR EDIT TRACKING ---
  isEdited: { type: Boolean, default: false },
  lastUpdatedDate: { type: Date },
  editedBy: { type: String, default: '' }
}, { timestamps: true });

const FactoryLog = mongoose.model('FactoryLog', factoryLogSchema);
export default FactoryLog;