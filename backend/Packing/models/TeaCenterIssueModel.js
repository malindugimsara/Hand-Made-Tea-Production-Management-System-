import mongoose from 'mongoose';

const issueItemSchema = new mongoose.Schema({
    product: { 
        type: String, 
        required: true 
    },
    type: { // අලුතින් එකතු කළ Packaging Type එක
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
    
    // Added tracking fields for edits
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