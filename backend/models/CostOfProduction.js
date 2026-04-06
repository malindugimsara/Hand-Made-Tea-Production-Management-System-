import mongoose from 'mongoose';

const costOfProductionSchema = new mongoose.Schema({
    month: { 
        type: String, 
        required: true 
    }, // Format: "2026-04"
    monthlyGlRate: { 
        type: Number, 
        default: 0 
    },
    labourRate: { 
        type: Number, 
        default: 1350 
    },
    electricityRate: { 
        type: Number, 
        default: 10 
    },
    teaCosts: [{
        teaType: String,
        selectedWeight: Number,
        madeTeaWeight: Number,
        glCost: Number,
        selectionCost: Number,
        handRollingCost: Number,
        electricityCost: Number,
        supervisionCost: Number,
        totalCost: Number
    }],
    grandTotal: { 
        type: Number, 
        required: true 
    }
}, { timestamps: true });

export const CostOfProduction = mongoose.model('CostOfProduction', costOfProductionSchema);