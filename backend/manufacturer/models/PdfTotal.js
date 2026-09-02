import mongoose from 'mongoose';

const pdfTotalSchema = new mongoose.Schema({
    date: { type: String, required: true }, // e.g., "2026-08-02"
    month: { type: String, required: true }, // e.g., "2026-08"
    routeKey: { type: String, required: true }, // e.g., "c1", "c2"
    day: { type: Number, required: true }, // e.g., 2
    totalKg: { type: Number, required: true }
}, { timestamps: true });

// දිනකට එක් Route එකක් සඳහා තිබිය හැක්කේ එක් වාර්තාවක් පමණක් නිසා Unique Index එකක් යෙදීම
pdfTotalSchema.index({ date: 1, routeKey: 1 }, { unique: true });

export default mongoose.model('PdfTotal', pdfTotalSchema);