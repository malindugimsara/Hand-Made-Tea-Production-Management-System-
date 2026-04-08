import mongoose from 'mongoose';

// Sub-schema for individual tea rows
const TeaSummarySchema = new mongoose.Schema({
    type: { type: String, required: true },
    totalGL: { type: Number, default: 0 },
    totalMT: { type: Number, default: 0 },
    totalSelectionWorkers: { type: Number, default: 0 },
    hrWorkers: { type: Number, default: 0 },
    selectionCost: { type: Number, default: 0 },
    handRollingCost: { type: Number, default: 0 },
    totalDryerUnits: { type: Number, default: 0 },
    rPoints: { type: Number, default: 0 },
    dryerCost: { type: Number, default: 0 },
    rollerCost: { type: Number, default: 0 },
    totalElectricityCost: { type: Number, default: 0 }
}, { _id: false }); // Disable _id for sub-documents to keep it clean

// Main schema
const ProductionSummarySchema = new mongoose.Schema({
    reportMonth: { type: String, required: true, unique: true }, // e.g., '2026-04'
    labourRate: { type: Number, required: true },
    electricityRate: { type: Number, required: true },
    teaSummaries: [TeaSummarySchema], // Array of the rows
    grandTotals: {
        totalGL: { type: Number, default: 0 },
        totalMT: { type: Number, default: 0 },
        totalSelectionWorkers: { type: Number, default: 0 },
        hrWorkers: { type: Number, default: 0 },
        selectionCost: { type: Number, default: 0 },
        handRollingCost: { type: Number, default: 0 },
        totalDryerUnits: { type: Number, default: 0 },
        rPoints: { type: Number, default: 0 },
        dryerCost: { type: Number, default: 0 },    
        rollerCost: { type: Number, default: 0 },
        totalElectricityCost: { type: Number, default: 0 }
    }
}, { timestamps: true });

export default mongoose.model('ProductionSummary', ProductionSummarySchema);