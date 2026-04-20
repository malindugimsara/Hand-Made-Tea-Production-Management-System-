import mongoose from 'mongoose';

const dehydratorSchema = new mongoose.Schema({
    date: {
        type: String, // 'YYYY-MM-DD' format
        required: true
    },
    trial: {
        type: String, // e.g., Mango, Kiwi
        required: true
    },
    meterStart: {
        type: Number,
        required: true
    },
    meterEnd: {
        type: Number,
        required: true
    },
    totalUnits: {
        type: Number,
        required: true
    },
    timePeriodHours: {
        type: Number,
        required: true
    },
    
    // --- Yield & Moisture ---
    startWeight: {
        type: Number,
        required: true
    },
    endWeight: {
        type: Number,
        required: true
    },
    moisturePercentage: {
        type: Number,
        required: true
    },

    // --- Labour ---
    labourHours: {
        type: Number,
        required: true
    },
    labourCostPer8Hours: {
        type: Number,
        required: true
    },
    totalLabourCost: {
        type: Number,
        required: true
    },

    // --- NEW: Electricity Costs ---
    electricityRate: {
        type: Number,
        required: true
    },
    totalElectricityCost: {
        type: Number,
        required: true
    }
    ,
    updatedBy: {
        type: String,
        default: null
    }
}, { 
    timestamps: true // createdAt and updatedAt fields automatically add wenawa
});

export const Dehydrator = mongoose.model('Dehydrator', dehydratorSchema);