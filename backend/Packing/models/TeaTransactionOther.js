import mongoose from 'mongoose';

const transactionItemSchema = new mongoose.Schema({
    grade: { 
        type: String, 
        required: true 
    },
    qtyKg: { 
        type: Number, 
        required: true 
    }
});

// Main Transaction Record Schema
const teaTransactionSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true 
    },
    transactionNo: { 
        type: String, 
       
    },
    totalQtyKg: { 
        type: Number, 
        required: true 
    },
    items: [transactionItemSchema],
    
    partyName: { 
        type: String,
        required: false 
    },
    updatedBy: { type: String },
    createdBy: { type: String }
}, { 
    timestamps: true 
});

const TeaTransactionOther = mongoose.model('TeaTransactionOther', teaTransactionSchema);

export default TeaTransactionOther;