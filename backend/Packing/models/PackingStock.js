import mongoose from 'mongoose';

const sourceStockSchema = new mongoose.Schema({
    sourceName: { 
        type: String, 
        required: true,
        enum: ['Factory', 'Other', 'Handmade']
    }, 
    // 👇 මේ අලුත් Fields දෙක දාන්න ඕනේ 👇
    transInAmount: { type: Number, default: 0 }, // ආපු මුළු ගාණ
    issueAmount: { type: Number, default: 0 },   // නිකුත් කරපු මුළු ගාණ
    // ------------------------------------
    quantityKg: { type: Number, default: 0 }     // දැනට ඉතිරි ගාණ
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