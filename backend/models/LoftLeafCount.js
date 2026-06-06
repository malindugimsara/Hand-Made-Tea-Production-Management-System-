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
    
    // මේ record එක Factory sample එකක්ද Leaf collector කෙනෙක්ගේ එකක්ද යන්න
    sampleType: {
        type: String,
        enum: ['Factory', 'LeafCollector'],
        required: true
    },
    
    // Factory sample එකක් නම් අදාල Officer ගේ නම
    officerName: {
        type: String,
        default: "",
    },

    // --- යාවත්කාලීන කළ Total Leaf Qty Field එක ---
    totalLeafQty: {
        type: Number,
        required: function() {
            // මේ වාර්තාව 'Factory' එකක් නම් පමණක් මේ Field එක අනිවාර්ය (Required) වේ.
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