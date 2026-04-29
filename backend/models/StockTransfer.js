import mongoose from 'mongoose';

const transferItemSchema = new mongoose.Schema({
    product: {
        type: String,
        required: true,
        trim: true
    },
    issuedQtyKg: {
        type: Number,
        required: true,
        min: 0
    },
    // This is filled in ONLY when the packing officer accepts the stock
    receivedQtyKg: {
        type: Number,
        default: null 
    }
});

const stockTransferSchema = new mongoose.Schema({
    transferId: {
        type: String,
        required: true,
        unique: true
    },
    dateIssued: {
        type: Date,
        required: true,
        default: Date.now
    },
    dateReceived: {
        type: Date,
        default: null
    },
    // 'PENDING' = Sent by Handmade, waiting for Packing. 'COMPLETED' = Received by Packing.
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED'],
        default: 'PENDING'
    },
    items: {
        type: [transferItemSchema],
        required: true,
        validate: [v => v.length > 0, 'A transfer must contain at least one item.']
    },
    source: {
        type: String,
        enum: ['Factory', 'Handmade', 'Other'],
        required: true,
    },
    issuedBy: {
        type: String,
        required: true
    },
    receivedBy: {
        type: String,
        default: null
    },
    remarks: {
        type: String,
        trim: true
    }
}, {
    timestamps: true 
});

const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);

export default StockTransfer;