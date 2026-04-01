import mongoose from 'mongoose';

const labourSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    workerCount: {
        type: Number,
        required: true
    }, // Number of workers employed that day
}, { timestamps: true });

export const Labour = mongoose.model('Labour', labourSchema);