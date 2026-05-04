import mongoose from 'mongoose';

const materialItemSchema = new mongoose.Schema({
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    // 👇 අලුතින් එකතු කළ Category Field එක 👇
    category: {
        type: String,
        enum: ['flavor', 'other'], // මේ වර්ග දෙකෙන් එකක් විය යුතුයි
        default: 'other'
    }
}, { _id: false });

const rawMaterialInSchema = new mongoose.Schema({
    date: { 
        // Frontend එකෙන් "YYYY-MM-DD" විදියට එන නිසා String තිබීම වඩාත් ආරක්ෂිතයි
        type: String, 
        required: true 
    },
    invoiceNo: { 
        type: String, 
        required: true 
    },
    supplierName: { 
        type: String,
        required: true 
    },
    items: [materialItemSchema],
    
    receivedBy: { type: String },
    remarks: { type: String },
    
    // 👇 අලුතින්: Edit කරපු කෙනාගේ නම Save වෙන්න 👇
    editorName: { type: String },
    updatedBy: { type: String }
}, { 
    timestamps: true 
});

const RawMaterialIn = mongoose.model('RawMaterialIn', rawMaterialInSchema);
export default RawMaterialIn;