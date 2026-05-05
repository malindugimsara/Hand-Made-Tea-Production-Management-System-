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
    const token = jwt.sign(
      { id: user._id, role: user.role , name: user.username }, 
      process.env.JWT_KEY, 
      { expiresIn: '12h' } // Token expires in 12 hours
    );

    res.status(200).json({ 
      message: "Login successful", 
      token, 
      role: user.role, 
      username: user.username 
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
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