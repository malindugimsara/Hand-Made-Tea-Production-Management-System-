import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });

    // Cookies සම්පූර්ණයෙන්ම ඉවත් කර, Frontend එකට අවශ්‍ය දත්ත කෙලින්ම යවන්න
    res.status(200).json({
        message: "Login Successful",
        token: token,
        role: user.role,         // <--- Login.jsx එකේ data.role විදිහට ගන්න මේක අනිවාර්යයි
        username: user.username  // <--- Login.jsx එකේ data.username විදිහට ගන්න මේක අනිවාර්යයි
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Logout User
export const logoutUser = (req, res) => {
    // දැන් Cookies භාවිතා නොකරන නිසා මෙහි ලොකු දෙයක් කිරීමට නැත. 
    // Frontend එකෙන් LocalStorage එක Clear කිරීම තමයි ප්‍රධානම දේ.
    res.status(200).json({ message: "Logged out successfully" });
};

// Create a new user (Only Admins will be able to hit this route later)
export const registerUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const newUser = new User({ username, password, role });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error creating user. Username might exist." });
  }
};