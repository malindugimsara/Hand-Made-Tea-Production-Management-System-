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
        sampleType: {
        type: String,
        enum: ['Factory', 'LeafCollector'],
        required: true
    },
    
    officerName: {
        type: String,
        default: "",
    },

    totalLeafQty: {
        type: Number,
        required: function() {
            return this.sampleType === 'Factory';
        },
        default: null,
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
    
    // --- TOTAL ---
    totalQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    
    // To track who last edited the record
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