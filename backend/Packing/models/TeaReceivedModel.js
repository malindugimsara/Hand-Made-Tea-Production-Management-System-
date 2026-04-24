import mongoose from 'mongoose';

// Corresponds to the items list in the frontend payload
const receivedItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
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
        required: true,
        // Optional: you can add a unique constraint if transaction numbers shouldn't repeat
        // unique: true 
    },
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    receivedItems: [receivedItemSchema],
    
    // Optional: useful if you are tracking edits/creators in your system
    // createdBy: { type: String },
    updatedBy: { type: String }
}, { 
    timestamps: true 
});

const TeaReceived = mongoose.model('TeaReceived', teaReceivedSchema);

export default TeaReceived;