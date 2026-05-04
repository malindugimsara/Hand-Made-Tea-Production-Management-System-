import mongoose from 'mongoose';

// Packing Materials (Label, Pouch, Box etc.) සඳහා වෙනම කුඩා Schema එකක්
const packingMaterialSchema = new mongoose.Schema({
    name: { type: String },
    qty: { type: Number }
});

const issueItemSchema = new mongoose.Schema({
    product: { 
        type: String, 
        required: true 
    },
    type: { // Packaging Type (E/L Pack, Box, etc.)
        type: String 
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
    
    // 👇 අලුතින් එකතු කළ යුතු Fields (For Stock Reversal) 👇
    baseTeaQtyKg: { 
        type: Number, 
        default: 0 
    },
    rawMaterialName: { // Flavor Name
        type: String, 
        default: "" 
    },
    rawMaterialQtyKg: { // Flavor Qty
        type: Number, 
        default: 0 
    },
    packingMaterials: [packingMaterialSchema] // Multiple Packing Materials Array
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