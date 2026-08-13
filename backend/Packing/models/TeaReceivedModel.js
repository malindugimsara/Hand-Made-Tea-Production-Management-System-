import mongoose from 'mongoose';

// Corresponds to the items list in the frontend payload
const receivedItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
    },
    // පිරිසිදු කළ නම save කිරීමට
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
    // Packing එකට ලැබුණු ගාණ (Received Qty)
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    receivedItems: [receivedItemSchema],
    
    // Update කළ කෙනාගේ නම
    updatedBy: { 
        type: String 
    }
}, { 
    timestamps: true 
});

const TeaReceived = mongoose.model('TeaReceived', teaReceivedSchema);

export default TeaReceived;