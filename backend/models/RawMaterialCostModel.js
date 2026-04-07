import mongoose from 'mongoose';

const rawMaterialCostSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true, 
        default: Date.now 
    },
    materialType: { 
        type: String, 
        required: true 
    }, // Ex: Heenbowitiya, Moringa, Gotukola
    dryWeight: { 
        type: Number, 
        required: true 
    }, // Dry(g)
    meterStart: { 
        type: Number, 
        required: true 
    }, // Meter reading Start
    meterEnd: { 
        type: Number, 
        required: true 
    }, // Meter reading End
    totalPoints: { 
        type: Number, 
        required: true 
    }, // Total point
    rawMaterialCost: { 
        type: Number, 
        required: true 
    }, // Cost: Raw material
    electricityCost: { 
        type: Number, 
        required: true 
    }, // Cost: Electricity
    totalCost: { 
        type: Number, 
        required: true 
    } // Total cost
}, { timestamps: true });

export const RawMaterialCost = mongoose.model('RawMaterialCost', rawMaterialCostSchema);