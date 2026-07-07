import mongoose from 'mongoose';

const stockAdjustmentLogSchema = new mongoose.Schema({
    itemType: { 
        type: String, 
        required: true, 
        enum: ['tea', 'raw', 'spicy'] // Added 'spicy' here
    },
    itemName: { 
        type: String, 
        required: true 
    },
    sourceName: { 
        type: String // 'Factory', 'Handmade', 'Other' (Only for Tea)
    }, 
    action: { 
        type: String, 
        required: true, 
        enum: ['add', 'remove'] // Add = Trans In, Remove = Issue
    },
    amount: { 
        type: Number, 
        required: true 
    },
    reason: { 
        type: String 
    },
    adjustedBy: { 
        type: String,
        default: 'System User'
    }
}, { 
    timestamps: true 
});

const StockAdjustmentLog = mongoose.model('StockAdjustmentLog', stockAdjustmentLogSchema);
export default StockAdjustmentLog;