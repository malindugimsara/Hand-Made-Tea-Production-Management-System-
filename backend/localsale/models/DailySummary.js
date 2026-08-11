import mongoose from 'mongoose';

// Item Schema (එක් එක් තේ වර්ගය සහ එහි IN/OUT ප්‍රමාණය සඳහා)
const itemSchema = new mongoose.Schema({
    categoryId: { type: String, required: true },
    categoryTitle: { type: String, required: true },
    size: { type: String, required: true },
    in: { type: Number, default: 0 },
    out: { type: Number, default: 0 },
    lastEditedBy: { type: String, default: null },
    lastEditedAt: { type: Date, default: null }
});

// Main Daily Summary Schema
const dailySummarySchema = new mongoose.Schema({
    date: { 
        type: String, 
        required: true, 
        unique: true // එක දවසකට තිබිය හැක්කේ එක් වාර්තාවක් පමණි
    }, 
    items: [itemSchema]
}, { 
    timestamps: true 
});

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export default DailySummary;