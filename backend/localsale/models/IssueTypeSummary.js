import mongoose from 'mongoose';

const issueItemSchema = new mongoose.Schema({
    categoryId: { type: String, required: true },
    categoryTitle: { type: String, required: true },
    size: { type: String, required: true },
    out: { type: Number, default: 0 } // OUT පමණක් අඩංගු වේ
});

const issueTypeSummarySchema = new mongoose.Schema({
    date: { type: String, required: true },
    issueType: { type: String, required: true }, // Free issued, Labour issued, Staff issued
    items: [issueItemSchema]
}, { 
    timestamps: true 
});

// එකම දවසක එකම Issue Type එකට අදාලව තිබිය හැක්කේ එක් වාර්තාවකි
issueTypeSummarySchema.index({ date: 1, issueType: 1 }, { unique: true });

const IssueTypeSummary = mongoose.model('IssueTypeSummary', issueTypeSummarySchema);
export default IssueTypeSummary;