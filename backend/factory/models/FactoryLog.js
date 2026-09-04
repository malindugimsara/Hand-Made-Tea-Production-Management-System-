import mongoose from 'mongoose';

const factoryLogSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  
  // --- GREEN LEAF SECTION (Divided into Estate & Brought) ---
  greenLeaf: { 
    estateLeaf: { 
      today: { type: Number, default: 0 }, 
      toDate: { type: Number, default: 0 } 
    },
    broughtLeaf: { 
      today: { type: Number, default: 0 }, 
      toDate: { type: Number, default: 0 } 
    },
    // මේ දෙකේම එකතුව (Total) පහසුවෙන් ලබාගැනීමට
    totalToday: { type: Number, default: 0 }, 
    totalToDate: { type: Number, default: 0 } 
  },

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