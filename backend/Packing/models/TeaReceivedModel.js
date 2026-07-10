import mongoose from 'mongoose';

// Corresponds to the items list in the frontend payload
const receivedItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
    },
    // අලුතින් එකතු කළ field එක (පිරිසිදු කළ නම save කිරීමට)
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
    // Factory එකෙන් එවපු ගාණ (Issued Qty) පෙන්වීමට
    sentQtyKg: { 
        type: Number 
    },
    // Packing එකට ලැබුණු ගාණ (Received Qty)
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    receivedItems: [receivedItemSchema],
    
    // 🌟 අලුතින් එකතු කළ Fields 🌟
    isManual: { 
        type: Boolean, 
        default: false // Manual Entry එකක්ද යන්න හඳුනා ගැනීමට
    },
    factoryUsername: { 
        type: String // Factory එකෙන් එව්ව කෙනාගේ නම
    },
    acceptedBy: { 
        type: String // Packing එකෙන් Accept කරපු කෙනාගේ නම
    },
    
    updatedBy: { type: String }
}, { 
    timestamps: true 
});

const TeaReceived = mongoose.model('TeaReceived', teaReceivedSchema);

export default TeaReceived;