import mongoose from 'mongoose';

// Sub-schema to track packed inventory for specific box/pack sizes
const packedStockSchema = new mongoose.Schema({
    packSizeKg: {
        type: Number,
        required: true,
        min: 0
    },
    numberOfBoxes: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    totalQtyKg: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
});

// Main schema for the Packing Section Stock
const packingStockSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true,
    },
    source: {
        type: String,
        enum: ['Factory', 'Handmade', 'Other'],
        required: true,
        default: 'Factory'
    },
    // The amount of loose tea (in Kg) currently sitting in the packing section waiting to be packed
    bulkStockKg: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    // The inventory of tea that has already been packed into specific sizes
    packedItems: [packedStockSchema],
    
    // The grand total of BOTH bulk tea and packed tea (in Kg)
    totalOverallQtyKg: {
        type: Number,
        default: 0,
        min: 0
    },
    lastUpdatedBy: { 
        type: String, 
        default: '' 
    }
}, {
    timestamps: true
});

// Pre-save hook to automatically calculate the totalOverallQtyKg before saving to the database
packingStockSchema.pre('save', function(next) {
    let packedTotal = 0;
    
    if (this.packedItems && this.packedItems.length > 0) {
        this.packedItems.forEach(item => {
            // Ensure the sub-total is accurate just in case
            item.totalQtyKg = item.packSizeKg * item.numberOfBoxes;
            packedTotal += item.totalQtyKg;
        });
    }

    // Grand total = Loose Bulk Tea + All Packed Tea
    this.totalOverallQtyKg = this.bulkStockKg + packedTotal;
    next();
});

const PackingStock = mongoose.model('PackingStock', packingStockSchema);

export default PackingStock;