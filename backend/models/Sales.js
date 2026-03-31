import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true 
    },
    teaType: { 
        type: String, 
        required: true 
    }, // e.g., Purple Tea, Silver Tips
    packagingType: { 
        type: String, 
        required: true 
    }, // e.g., Paper Can, Reusable Bag
    unitsSold: { 
        type: Number, 
        required: true 
    }, // Number of packs
    weightPerUnit: { 
        type: Number, 
        required: true 
    }, // e.g., 0.05kg (50g)
    totalWeight: { 
        type: Number, 
        required: true 
    }, // Calculated as unitsSold * weightPerUnit
    priceUSD: { 
        type: Number, 
        required: true 
    },
    exchangeRate: { 
        type: Number, 
        required: true 
    }, // Current USD to LKR rate
    totalLKR: { 
        type: Number, 
        required: true 
    }, // priceUSD * exchangeRate
    customerName: String
}, { timestamps: true });

export const Sales = mongoose.model('Sales', salesSchema);