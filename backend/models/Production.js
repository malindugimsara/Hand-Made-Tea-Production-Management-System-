import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    teaType: { type: String, required: true }, // e.g., Purple, Pink, White
    madeTeaWeight: { type: Number, required: true }, // Kg
    dryerDetails: {
        meterStart: Number,
        meterEnd: Number,
        units: Number
    }
}, { timestamps: true });

export const Production = mongoose.model('Production', productionSchema);