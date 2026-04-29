import mongoose from 'mongoose';

// පොදු Item Schema එකක් (Trans-in සහ Trans-out දෙකටම ගැලපෙන්න)
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
    // Optional: වාර්තාව වෙනස් කළ පුද්ගලයා
    updatedBy: { type: String },
    createdBy: { type: String }
}, { 
    timestamps: true 
});

// Model එකේ නම TeaTransaction ලෙස වෙනස් කිරීම වඩාත් අර්ථවත් වේ
const TeaTransactionOther = mongoose.model('TeaTransactionOther', teaTransactionSchema);

export default TeaTransactionOther;