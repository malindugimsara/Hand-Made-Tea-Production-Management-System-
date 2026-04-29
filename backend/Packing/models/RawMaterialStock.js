import mongoose from 'mongoose';

const rawMaterialStockSchema = new mongoose.Schema({
    materialName: { 
        type: String, 
        required: true,
        unique: true // එක අමුද්‍රව්‍යයකට එක පේළියක් පමණක් තිබීම සඳහා
    },
    // 👇 අලුතින් එකතු කළ කොටස (අනිවාර්ය නැත, නමුත් දාන එක හොඳයි) 👇
    category: { 
        type: String,
        enum: ['flavor', 'other'], // මේ වර්ග දෙකෙන් එකක් වෙන්න ඕනේ
        default: 'other'
    },
    totalQuantity: { 
        type: Number, 
        default: 0 
    },
    unit: { 
        type: String, 
        required: true // උදා: 'pcs', 'kg', 'rolls'
    },
    category: {
        type: String,
        enum: ['flavor', 'other'],
        default: 'other'
    }
}, { 
    timestamps: true 
});

const RawMaterialStock = mongoose.model('RawMaterialStock', rawMaterialStockSchema);
export default RawMaterialStock;