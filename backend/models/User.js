import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // 1. Role එක Admin සහ User ලෙස සරල කිරීම
  role: { 
    type: String, 
    enum: ['Admin', 'User', 'Viewer'], 
    default: 'User' 
  },

  // 2. අලුතින් එකතු කළ කොටස: User ට Access තියෙන Sections (Paths) ලැයිස්තුව
  // උදාහරණ: ['localsale', 'handmade']
  allowedPaths: { 
    type: [String], 
    default: [] 
  }
}, { timestamps: true }); // timestamps දැමීමෙන් user create කළ වෙලාව ඉබේම save වේ

// Automatically hash the password before saving to the database
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Helper method to check if password is correct
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);