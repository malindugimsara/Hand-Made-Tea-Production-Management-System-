import mongoose from 'mongoose';

const SellingRecordSchema = new mongoose.Schema({
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  packs: { type: Number, required: true },
  price: { type: Number, required: true },
  totalUsd: { type: Number },
  totalLkr: { type: Number }
});

const SellingDetailsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  exchangeRate: { type: Number, required: true },
  records: [SellingRecordSchema], // Array of the tea items sold
});

export default mongoose.model('SellingDetails', SellingDetailsSchema);