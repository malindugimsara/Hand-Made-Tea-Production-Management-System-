import mongoose from 'mongoose';

const dehydratorSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true 
    },
    itemName: { 
        type: String, 
        required: true 
    }, // e.g., Mango, Kiwi, Cinnamon
    rawWeight: { 
        type: Number, 
        required: true 
    }, // Weight before drying
    dryWeight: { 
        type: Number, 
        required: true 
    }, // Weight after drying
    electricityMeter: {
        start: { type: Number, required: true },
        end: { type: Number, required: true },
        unitsConsumed: { type: Number } // (end - start)
    },
    durationHours: { 
        type: Number 
    }, // Time taken for the process
    remarks: String
}, { timestamps: true });

export const Dehydrator = mongoose.model('Dehydrator', dehydratorSchema);