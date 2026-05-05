import mongoose from 'mongoose';

// Schema for the individual tea products inside the transfer
const transferItemSchema = new mongoose.Schema({
    product: { 
        type: String, 
        required: true 
    },
    issuedQtyKg: { 
        type: Number, 
        required: true 
    },
    receivedQtyKg: { 
        type: Number, 
        default: 0 
    }
});

// Main schema for the Transfer record
const handmadeTransferSchema = new mongoose.Schema({
    transferId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    dateIssued: { 
        type: Date, 
        default: Date.now 
    },
    dateReceived: { 
        type: Date 
    },
    issuedBy: { 
        type: String, 
        required: true 
    },
    receivedBy: { 
        type: String,
        default: 'Pending' 
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending'
    },
    items: [transferItemSchema] // Array of the items defined above
}, { 
    timestamps: true // Automatically adds createdAt and updatedAt
});

const HandmadeTransfer = mongoose.model('HandmadeTransfer', handmadeTransferSchema);

export default HandmadeTransfer;