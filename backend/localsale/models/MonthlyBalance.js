import mongoose from 'mongoose';

const balanceItemSchema = new mongoose.Schema({
    categoryId: { type: String, required: true },
    categoryTitle: { type: String, required: true },
    size: { type: String, required: true },
    
    // Ledger Fields
    bmStock: { type: Number, default: 0 },         // Brought Forward from last month
    in: { type: Number, default: 0 },              // Total inward for the month
    out: { type: Number, default: 0 },             // Total outward (sales) for the month
    adjustment: { type: Number, default: 0 },      // Manual corrections (e.g., damaged/lost goods)
    closingBalance: { type: Number, default: 0 }   // Final calculated stock
});

const monthlyBalanceSchema = new mongoose.Schema({
    month: { 
        type: String, 
        required: true, 
        unique: true // e.g., "2026-07". Only one snapshot per month.
    }, 
    items: [balanceItemSchema],
    status: {
        type: String,
        enum: ['Draft', 'Closed'], // 'Closed' locks the record
        default: 'Draft'
    },
    closedBy: {
        type: String // Optional: Store the username of the admin who closed the month
    }
}, { 
    timestamps: true 
});

export default mongoose.model('MonthlyBalance', monthlyBalanceSchema);