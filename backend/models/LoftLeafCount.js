import mongoose from "mongoose";

const loftLeafCountSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    route: { 
        type: String, 
        required: true 
    },
    
    // --- BEST ---
    bestQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    bestPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    // --- BELOW BEST ---
    belowBestQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    belowBestPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    // --- POOR ---
    poorQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    poorPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    // --- TOTAL (Optional but highly recommended for validation) ---
    totalQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // To track who last edited the record (matching your existing logic)
    updatedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const LoftLeafCount = mongoose.model("LoftLeafCount", loftLeafCountSchema);

export default LoftLeafCount;
