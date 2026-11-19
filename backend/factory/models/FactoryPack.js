import mongoose from 'mongoose';

// Sub-schema to hold Received, Used, Damaged, and Balance numbers
const stockMetricsSchema = new mongoose.Schema({
  received: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  damaged: { type: Number, default: 0 },
  balance: { type: Number, default: 0 }
}, { _id: false });

const factoryPackSchema = new mongoose.Schema({
  date: { 
    type: String, // Stored as YYYY-MM-DD
    required: true, 
    unique: true // Ensures only one row per day
  },
  agSuper: { type: stockMetricsSchema, default: () => ({}) },
  aGroup: { type: stockMetricsSchema, default: () => ({}) },
  sampleBags: { type: stockMetricsSchema, default: () => ({}) },
  unmarked: { type: stockMetricsSchema, default: () => ({}) } // Added Unmarked category
}, { timestamps: true });

const FactoryPack = mongoose.models.FactoryPack || mongoose.model('FactoryPack', factoryPackSchema);
export default FactoryPack;