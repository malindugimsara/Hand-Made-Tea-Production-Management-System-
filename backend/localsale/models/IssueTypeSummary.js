import mongoose from 'mongoose';

const issueItemSchema = new mongoose.Schema({
    categoryId: { type: String, required: true },
    categoryTitle: { type: String, required: true },
    size: { type: String, required: true },
    out: { type: Number, default: 0 },
    lastEditedBy: { type: String, default: null },
    lastEditedAt: { type: Date, default: null }
});

const issueTypeSummarySchema = new mongoose.Schema({
    date: { type: String, required: true },
    issueType: { type: String, required: true }, 
    items: [issueItemSchema],
}, { 
    timestamps: true 
});

issueTypeSummarySchema.index({ date: 1, issueType: 1 }, { unique: true });

const IssueTypeSummary = mongoose.model('IssueTypeSummary', issueTypeSummarySchema);
export default IssueTypeSummary;