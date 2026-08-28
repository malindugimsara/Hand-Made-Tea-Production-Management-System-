import mongoose from 'mongoose';

const loftLeafSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD
    route: { type: String, required: true }, // e.g., C1, C2, ESTATE
    arrivalTime: { type: String }, // e.g., 19:42
    officerName: { type: String },
    totalLeafQtyKg: { type: Number, default: 0 },

    factorySupervisorName: { type: String, default: null },
    leafCollectorName: { type: String, default: null },

    // Factory Sample Data
    factorySample: {
        isEntered: { type: Boolean, default: false },
        bestG: { type: Number, default: 0 },
        belowBestG: { type: Number, default: 0 },
        poorG: { type: Number, default: 0 },
        // Calculated percentages
        bestPct: { type: Number, default: 0 },
        belowBestPct: { type: Number, default: 0 },
        poorPct: { type: Number, default: 0 },
    },

    // Collector Sample Data
    collectorSample: {
        isEntered: { type: Boolean, default: false },
        bestG: { type: Number, default: 0 },
        belowBestG: { type: Number, default: 0 },
        poorG: { type: Number, default: 0 },
        // Calculated percentages
        bestPct: { type: Number, default: 0 },
        belowBestPct: { type: Number, default: 0 },
        poorPct: { type: Number, default: 0 },
    },

    // Final Calculated KGs based on Factory Sample & Total Qty
    calculatedKg: {
        bestKg: { type: Number, default: 0 },
        belowBestKg: { type: Number, default: 0 },
        poorKg: { type: Number, default: 0 },
    },

    editedBy: { type: String, default: null } 
}, { timestamps: true });

// Ensure only one record per route per day
loftLeafSchema.index({ date: 1, route: 1 }, { unique: true });

export default mongoose.model('LoftLeaf', loftLeafSchema);