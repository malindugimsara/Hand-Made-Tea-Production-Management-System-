import mongoose from 'mongoose';

// Item Schema 
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
        unique: true 
    }, 
    items: [itemSchema]
}, { 
    timestamps: true 
});

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export default DailySummary;