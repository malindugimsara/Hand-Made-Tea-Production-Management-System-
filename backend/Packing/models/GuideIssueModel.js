import mongoose from 'mongoose';

const guideIssueItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
    },
    packSizeKg: { 
        type: Number, 
        required: true 
    },
    numberOfBoxes: { // Corresponds to the "QTY(KG)" column in your image
        type: Number, 
        required: true 
    },
    totalQtyKg: { // Corresponds to the "total" column in your image
        type: Number, 
        required: true 
    }
});

const guideIssueSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true 
    },
    totalBoxes: { 
        type: Number, 
        required: true 
    },
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    issueItems: [guideIssueItemSchema],
    
    // Optional: useful if you are tracking edits/creators
    // createdBy: { type: String },
    updatedBy: { type: String }
}, { 
    timestamps: true 
});

const GuideIssue = mongoose.model('GuideIssue', guideIssueSchema);

export default GuideIssue;