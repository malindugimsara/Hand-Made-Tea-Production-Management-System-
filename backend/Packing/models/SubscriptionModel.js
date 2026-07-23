import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  // Subscription object එක ඒ විදියටම සේව් කරන්න පුළුවන් වෙන්න
  endpoint: { type: String, required: true, unique: true },
  expirationTime: { type: Date, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  // මොන අංශයේ කෙනාද කියලා දැනගන්න (Packing/Factory)
  section: { type: String, default: "Packing" } 
}, { timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);