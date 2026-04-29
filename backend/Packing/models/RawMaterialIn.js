import mongoose from 'mongoose';

const materialItemSchema = new mongoose.Schema({
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
}, { _id: false });

const rawMaterialInSchema = new mongoose.Schema({
    date: { 
        type: Date, 
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
    remarks: { type: String }
}, { 
    timestamps: true 
});

const RawMaterialIn = mongoose.model('RawMaterialIn', rawMaterialInSchema);
export default RawMaterialIn;