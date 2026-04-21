import mongoose from 'mongoose';

const dehydratorSchema = new mongoose.Schema({
    date: {
        type: String, // 'YYYY-MM-DD' format
        required: true
    },
    // --- NEW: Array to hold multiple items and their moisture details ---
    trialsData: [{
        trialName: { type: String, required: true },
        startWeight: { type: Number, required: true },
        endWeight: { type: Number, required: true },
        moisturePercentage: { type: Number, required: true }
    }],
    
    // --- Electricity ---
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
    electricityRate: {
        type: Number,
        required: true
    },
    totalElectricityCost: {
        type: Number,
        required: true
    },

    // --- Time & Labour ---
    timePeriodHours: {
        type: Number,
        required: true
    },
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

    // --- Meta ---
    updatedBy: {
        type: String,
        default: null
    }
}, { 
    timestamps: true // createdAt and updatedAt fields automatically add wenawa
});

export const Dehydrator = mongoose.model('Dehydrator', dehydratorSchema);