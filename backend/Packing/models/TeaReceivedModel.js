import mongoose from 'mongoose';

// Corresponds to the items list in the frontend payload
const receivedItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
    },
    teaType: { 
        type: String 
    },
    qtyKg: { 
        type: Number, 
        required: true 
    }
});

// Corresponds to the main record structure in the frontend
const teaReceivedSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true 
    },
    transactionNo: { 
        type: String, 
        required: true
    },
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    receivedItems: [receivedItemSchema],
    
    updatedBy: { 
        type: String 
    }
}, { 
    timestamps: true 
});

teaReceivedSchema.index({ date: -1 });

const TeaReceived = mongoose.model('TeaReceived', teaReceivedSchema);

export default TeaReceived;