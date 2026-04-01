import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    teaType: { type: String, required: true },
    madeTeaWeight: { type: Number, required: true },
    dryerDetails: {
        dryerName: { type: String, required: true }, 
        meterStart: Number,
        meterEnd: Number,
        units: Number
    }
}, { timestamps: true });

export const Production = mongoose.model('Production', productionSchema);