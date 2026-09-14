import mongoose from 'mongoose';

const sourceStockSchema = new mongoose.Schema({
    sourceName: { 
        type: String, 
        required: true,
        enum: ['Factory', 'Other', 'Handmade']
    }, 
    transInAmount: { type: Number, default: 0 }, 
    issueAmount: { type: Number, default: 0 }, 
    // ------------------------------------
    quantityKg: { type: Number, default: 0 }     
}, { _id: false });

const packingStockSchema = new mongoose.Schema({
    productName: { 
        type: String, 
        required: true, 
        unique: true 
    },
    stockBySource: [sourceStockSchema], 
    
    totalBulkStockKg: { 
        type: Number, 
        default: 0 
    },
    
    packedItems: [] 
}, { 
    timestamps: true 
});

const PackingStock = mongoose.model('PackingStock', packingStockSchema);
export default PackingStock;