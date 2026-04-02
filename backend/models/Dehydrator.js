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
    }
}, { 
    timestamps: true // createdAt and updatedAt fields automatically add wenawa
});


export const Dehydrator = mongoose.model('Dehydrator', dehydratorSchema);