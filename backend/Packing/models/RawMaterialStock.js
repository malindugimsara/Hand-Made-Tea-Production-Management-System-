import mongoose from 'mongoose';

const rawMaterialStockSchema = new mongoose.Schema({
    materialName: { 
        type: String, 
        required: true,
        unique: true // එක අමුද්‍රව්‍යයකට එක පේළියක් පමණක් තිබීම සඳහා
    },
    totalQuantity: { 
        type: Number, 
        default: 0 
    },
    unit: { 
        type: String, 
        required: true // උදා: 'pcs', 'kg', 'rolls'
    }
}, { 
    timestamps: true 
});

const RawMaterialStock = mongoose.model('RawMaterialStock', rawMaterialStockSchema);
export default RawMaterialStock;