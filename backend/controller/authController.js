import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Login User
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Find user
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // 3. Generate JWT containing the user ID and Role
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });

    // 4. Send JSON Response (Cookies අයින් කර ඇත, Frontend එකට අවශ්‍ය දත්ත පමණක් යවමු)
    res.status(200).json({ 
        message: "Login Successful", 
        token: token, 
        role: user.role,         // Frontend එකේ data.role ලෙස ගන්න
        username: user.username  // Frontend එකේ data.username ලෙස ගන්න
    });  
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
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