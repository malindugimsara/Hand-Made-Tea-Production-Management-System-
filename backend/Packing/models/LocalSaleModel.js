import mongoose from 'mongoose';

// Schema for individual packing materials used in an item
const packingMaterialSchema = new mongoose.Schema({
    name: { 
        type: String,
        trim: true
    },
    qty: { 
        type: Number,
        min: 0
    }
});

// Schema for individual items within a daily sale record
const saleItemSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
        trim: true
    },
    // Added Packaging Type (e.g., Box, Tin, E/L Pack)
    type: {
        type: String,
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
    totalQtyKg: { // Gross Quantity
        type: Number,
        required: true,
        min: 0
    },
    // 👇 NEW FIELDS FOR STOCK DEDUCTION / REVERSAL 👇
    baseTeaQtyKg: {
        type: Number,
        default: 0,
        min: 0
    },
    rawMaterialName: { // Flavor Name
        type: String,
        default: '',
        trim: true
    },
    rawMaterialQtyKg: { // Flavor Qty
        type: Number,
        default: 0,
        min: 0
    },
    packingMaterials: { // Array of packing items like Pouches, Labels
        type: [packingMaterialSchema],
        default: []
    },
    // 👆 ------------------------------------------ 👆
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
    updatedBy: { type: String, default: '' },
    editorName: { type: String, default: '' } // Good to match your frontend payload
}, {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true 
});

const LocalSale = mongoose.model('LocalSale', localSaleSchema);

export default LocalSale;