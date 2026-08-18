import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    teaType: { type: String, required: true },
    
    // --- NEW: Added selected tea weight ---
    selectedTeaWeight: { type: Number, default: 0 }, 
    
    madeTeaWeight: { type: Number, required: true },
    
    // --- Added expected date ---
    expectedDryerDate: { type: Date, required: true }, 
    
    dryerDetails: {
        dryerName: { type: String }, // --- REMOVED required: true ---
        meterStart: Number,
        meterEnd: Number,
        units: Number,
        rollerPoints: { type: Number, default: 0 }
    },
    updatedBy: { type: String, default: '' }
}, { timestamps: true });

export const Production = mongoose.model('Production', productionSchema);