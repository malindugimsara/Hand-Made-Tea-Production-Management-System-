import mongoose from 'mongoose';

const costingSchema = new mongoose.Schema({
    productionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Production' },
    date: { type: Date, required: true },
    selectionLabor: Number,
    rollingLabor: Number,
    selectionLaborCost: Number,
    rollingLaborCost: Number,
    electricityCost: Number,
    totalCost: Number,
    costPerKg: Number
}, { timestamps: true });

export const Costing = mongoose.model('Costing', costingSchema);