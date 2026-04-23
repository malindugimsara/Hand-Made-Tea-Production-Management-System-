import mongoose from 'mongoose';

// Schema for individual items within a daily sale record
const saleItemSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
        trim: true
    },
    packSizeKg: {
        type: Number,
        required: true,
        min: 0
    },
    numberOfBoxes: {
        type: Number,
        required: true,
        min: 0
    },
    totalQtyKg: {
        type: Number,
        required: true,
        min: 0
    },
    updatedBy: { type: String, default: '' }
});

// Main schema for the daily local sale record
const localSaleSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    totalBoxes: {
        type: Number,
        required: true,
        min: 0
    },
    totalQtyKg: {
        type: Number,
        required: true,
        min: 0
    },
    // Embed the sale items as an array of sub-documents
    salesItems: {
        type: [saleItemSchema],
        required: true,
        validate: [v => v.length > 0, 'A sale record must contain at least one item.']
    },
    updatedBy: { type: String, default: '' }
}, {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true 
});

const LocalSale = mongoose.model('LocalSale', localSaleSchema);

export default LocalSale;