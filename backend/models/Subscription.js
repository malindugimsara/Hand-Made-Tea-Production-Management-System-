import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  endpoint: { 
    type: String, 
    required: true, 
    unique: true 
  },
  expirationTime: { 
    type: Date, 
    default: null 
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  role: { 
    type: String, 
    default: 'Unknown' 
  },
  section: { 
    type: String, 
    default: 'Packing' 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

subscriptionSchema.index({ role: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
