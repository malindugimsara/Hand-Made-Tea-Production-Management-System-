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
    }, // Number of workers employed for Selection that day
    rollingType: {
        type: String,
        enum: ['Machine Rolling', 'Hand Rolling', 'Other'],
        default: 'Machine Rolling'
    }, // Type of rolling method used
    rollingWorkerCount: {
        type: Number,
        default: 0
    } // Number of workers used specifically for Hand Rolling
}, { timestamps: true });

export const Labour = mongoose.model('Labour', labourSchema);