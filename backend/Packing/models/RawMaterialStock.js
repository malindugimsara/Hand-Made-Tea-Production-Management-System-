import mongoose from 'mongoose';

const rawMaterialStockSchema = new mongoose.Schema({
    materialName: { 
        type: String, 
        required: true,
        unique: true
    },
    category: { 
        type: String,
        enum: ['flavor', 'other'],
        default: 'other'
    },
    // 👇 අලුතින් එකතු කළ Fields 👇
    transInAmount: { 
        type: Number, 
        default: 0 
    },
    issueAmount: { 
        type: Number, 
        default: 0 
    },
    // ----------------------------
    totalQuantity: { // මේක Current Stock එක විදියට ක්‍රියා කරයි
        type: Number, 
        default: 0 
    },
    unit: { 
        type: String, 
        required: true 
    }
}, { 
    timestamps: true 
});

const RawMaterialStock = mongoose.model('RawMaterialStock', rawMaterialStockSchema);
export default RawMaterialStock;