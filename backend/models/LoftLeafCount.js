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
    
    // --- අලුතින් එකතු කරන ලද Fields ---
    
    // මේ record එක Factory sample එකක්ද Leaf collector කෙනෙක්ගේ එකක්ද යන්න හඳුනාගැනීමට
    sampleType: {
        type: String,
        enum: ['Factory', 'LeafCollector'], // වර්ග දෙකෙන් එකක් විය යුතුය
        required: true
    },
    
    // Factory sample එකක් නම් අදාල Officer ගේ නම දැක්වීමට 
    officerName: {
        type: String,
        default: "", // Leaf collector's sample වලදී මෙය හිස්ව තැබිය හැක
    },

    // ------------------------------------

    // --- BEST (Count 1 / ප්‍රමිතියෙන් ඉහළ) ---
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
    
    // --- BELOW BEST (Count 2 / ප්‍රමිතියෙන් මධ්‍යම) ---
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
    
    // --- POOR (Count 3 / ප්‍රමිතියෙන් පහළ) ---
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
    
    // --- TOTAL (සම්පූර්ණ එකතුව) ---
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