import mongoose from 'mongoose';

const factoryLogSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  
  greenLeaf: { today: { type: Number, default: 0 }, toDate: { type: Number, default: 0 } },
  madeTea: { today: { type: Number, default: 0 }, toDate: { type: Number, default: 0 } },
  
  // --- DISPATCH ARRAY ---
  dispatch: { type: Number, default: 0 }, 
  dispatches: [{ 
    invoiceNo: String, 
    teaType: String, 
    weight: Number 
  }],
  
  // --- LOCAL SALE ARRAY ---
  localSaleAndGratis: { type: Number, default: 0 },
  localSales: [{ 
    teaType: String, 
    weight: Number 
  }],
  
  // --- RETURN ARRAY ---
  returnAmount: { type: Number, default: 0 },
  returns: [{ 
    teaType: String, 
    amount: Number 
  }],
  
  totalOut: { type: Number, default: 0 },
  bfBalance: { type: Number, default: 0 },
  factoryBalance: { type: Number, default: 0 },
  
  isEdited: { type: Boolean, default: false },
  lastUpdatedDate: Date,
  editedBy: String
}, { timestamps: true });

export default mongoose.model('FactoryLog', factoryLogSchema);