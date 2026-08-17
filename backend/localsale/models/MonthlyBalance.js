import mongoose from 'mongoose';

const monthlyBalanceSchema = new mongoose.Schema({
    month: { 
        type: String, 
        required: true, 
        unique: true // Format: "YYYY-MM"
    },
    items: [{
        categoryId: { type: String, required: true },
        categoryTitle: { type: String, required: true },
        size: { type: String, required: true },
        bmStock: { type: Number, default: 0 } // THIS IS THE ONLY THING SAVED!
    }]
}, { 
    timestamps: true 
});

export default mongoose.model('MonthlyBalance', monthlyBalanceSchema);