import mongoose from 'mongoose';

// A sub-schema to hold the Rec, Used, Bala numbers cleanly
const stockMetricsSchema = new mongoose.Schema({
  received: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
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
  sampleBags: { type: stockMetricsSchema, default: () => ({}) }
}, { timestamps: true });

const FactoryPack = mongoose.models.FactoryPack || mongoose.model('FactoryPack', factoryPackSchema);
export default FactoryPack;