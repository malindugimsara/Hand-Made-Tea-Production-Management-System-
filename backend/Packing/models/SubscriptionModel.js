import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  expirationTime: { type: Date, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  role: { type: String },
  section: { type: String, default: "Packing" } 
}, { timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);