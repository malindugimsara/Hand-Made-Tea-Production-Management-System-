import mongoose from 'mongoose';

const issueItemSchema = new mongoose.Schema({
    product: { 
        type: String, 
        required: true 
    },
    type: { // Packaging Type
        type: String, 
        required: true 
    },
    packSizeKg: { 
        type: Number, 
        required: true 
    },
    numberOfBoxes: { 
        type: Number, 
        required: true 
    },
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    baseTeaQtyKg: {
        type: Number,
        default: 0
    },
    // --- NEWLY ADDED FIELD ---
    rawMaterialName: {
        type: String,
        default: '' // Default to empty string for non-flavored teas
    },
    rawMaterialQtyKg: {
        type: Number,
        default: 0
    }
});

const TeaCenterIssueSchema = new mongoose.Schema({
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
    issueItems: [issueItemSchema],
    
    // Tracking fields for edits
    updatedBy: { 
        type: String, 
        default: '' 
    },
    editorName: { 
        type: String, 
        default: '' 
    }
}, { 
    timestamps: true 
});

const TeaCenterIssue = mongoose.model('TeaCenterIssue', TeaCenterIssueSchema);

export default TeaCenterIssue;