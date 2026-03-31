import mongoose from 'mongoose';

const greenLeafSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    totalWeight: { 
        type: Number, 
        required: true 
    }, // Total weight received (Kg)
    selectedWeight: { 
        type: Number, 
        required: true 
    }, // Weight chosen for hand-making
    returnedWeight: { 
        type: Number, 
        default: 0 
    }, // Weight sent back to the main factory
}, { timestamps: true });

export const GreenLeaf = mongoose.model('GreenLeaf', greenLeafSchema);