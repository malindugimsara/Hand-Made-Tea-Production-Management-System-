import mongoose from 'mongoose';

const balanceItemSchema = new mongoose.Schema({
    categoryId: { type: String, required: true },
    categoryTitle: { type: String, required: true },
    size: { type: String, required: true },
    bmStock: { type: Number, default: 0 },         // Brought Forward from last month
    in: { type: Number, default: 0 },              // Total inward for the month
    out: { type: Number, default: 0 },             // Total outward for the month
    adjustment: { type: Number, default: 0 },      // Manual corrections/audits
    closingBalance: { type: Number, default: 0 }   // Final calculated stock
});

const monthlyBalanceSchema = new mongoose.Schema({
    month: { 
        type: String, 
        required: true, 
        unique: true // Format: "YYYY-MM"
    }, 
    items: [balanceItemSchema],
    status: {
        type: String,
        enum: ['Draft', 'Closed'],
        default: 'Draft'
    }
}, { 
    timestamps: true 
});

export default mongoose.model('MonthlyBalance', monthlyBalanceSchema);