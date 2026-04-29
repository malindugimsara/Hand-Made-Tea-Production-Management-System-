import mongoose from 'mongoose';

// Source එක සහ අදාළ ප්‍රමාණය ගබඩා කිරීමට උප-ස්කීමාවක් (Sub-schema)
const sourceStockSchema = new mongoose.Schema({
    sourceName: { 
        type: String, 
        required: true,
        enum: ['Factory', 'Other', 'Handmade'] // ඔබට අවශ්‍ය sources මෙහි දෙන්න
    }, 
    quantityKg: { type: Number, default: 0 }
}, { _id: false });

const packingStockSchema = new mongoose.Schema({
    productName: { 
        type: String, 
        required: true, 
        unique: true // එකම නමින් ඇත්තේ එකම Document එකක් පමණයි
    },
    // විවිධ Sources වලින් පැමිණි තොග ප්‍රමාණ මෙහි Array එකක් ලෙස සටහන් වේ
    stockBySource: [sourceStockSchema], 
    
    // මේ සියලුම Sources වල මුළු එකතුව (Grand Total)
    totalBulkStockKg: { 
        type: Number, 
        default: 0 
    },
    
    packedItems: [] // ඔබේ දැනටමත් ඇති fields එලෙසම තබන්න
}, { 
    timestamps: true 
});

const PackingStock = mongoose.model('PackingStock', packingStockSchema);
export default PackingStock;