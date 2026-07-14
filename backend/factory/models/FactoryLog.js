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
  
  // --- DISPATCH DETAILS ---
  dispatch: { type: Number, default: 0 },
  invoiceNo: { type: String, default: '' },          
  dispatchTeaType: { type: String, default: '' },    
  
  // --- LOCAL SALE DETAILS ---
  localSaleAndGratis: { type: Number, default: 0 },
  localSaleTeaType: { type: String, default: '' },   
  
  totalOut: { type: Number, default: 0 },

  // --- RETURN DETAILS ---
  returnAmount: { type: Number, default: 0 },
  returnTeaType: { type: String, default: '' },      // අලුතින් එකතු කළ Field එක (Return Tea Type)
  
  bfBalance: { type: Number, default: 0 },
  factoryBalance: { type: Number, default: 0 },
  
  // --- ADDED FOR EDIT TRACKING ---
  isEdited: { type: Boolean, default: false },
  lastUpdatedDate: { type: Date },
  editedBy: { type: String, default: '' }
}, { timestamps: true });

const FactoryLog = mongoose.model('FactoryLog', factoryLogSchema);
export default FactoryLog;
