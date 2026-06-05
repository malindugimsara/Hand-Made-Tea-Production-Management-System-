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

    // 4. Token එක HTTP-Only Cookie එකක් විදිහට සෙට් කිරීම
    res.cookie('token', token, {
        httpOnly: true,
        secure: true, // Render eke HTTPS tiyena nisa meka aniwarayen true wenna oni
        sameSite: 'none', // Domains 2k athara cookie yawanna meka 'none' wenna onimai!
        maxAge: 2 * 60 * 60 * 1000 // Pay 2i
    });

res.status(200).json({ 
    message: "Login Successful", 
    token: token, // <-- Token එක මෙතනින් යවනවා
    user: userDetails 
});  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Logout User (අලුතින් එකතු කරන ලදි)
export const logoutUser = (req, res) => {
    // Cookie එක Clear කිරීම
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
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