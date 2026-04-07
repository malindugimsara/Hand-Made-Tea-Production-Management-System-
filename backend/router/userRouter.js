import express from 'express';
import User from '../models/User.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const userRouter = express.Router();

// 1. GET ALL USERS (Admin Only)
userRouter.get('/', verifyToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        // .select('-password') ensures we DO NOT send hashed passwords to the frontend
        const users = await User.find().select('-password'); 
        res.status(200).json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Server error fetching users." });
    }
});

// 2. CREATE USER (Admin Only)
userRouter.post('/register', verifyToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: "Username already taken." });

        const newUser = new User({ username, password, role });
        await newUser.save();

        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error while creating user." });
    }
});

// 3. EDIT USER (Admin Only)
userRouter.put('/:id', verifyToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const { username, role, password } = req.body;
        
        // Use findById -> modify -> save() so the password hashing pre-hook runs!
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found." });

        if (username) user.username = username;
        if (role) user.role = role;
        if (password && password.trim() !== "") {
            user.password = password; // Mongoose pre('save') will hash this automatically
        }

        await user.save();
        res.status(200).json({ message: "User updated successfully." });
    } catch (error) {
        // Handle duplicate username error
        if (error.code === 11000) return res.status(400).json({ message: "Username already taken." });
        res.status(500).json({ message: "Error updating user." });
    }
});

// 4. DELETE USER (Admin Only)
userRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        // Security check: Prevent the admin from accidentally deleting themselves!
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "You cannot delete your currently logged-in account." });
        }

        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user." });
    }
});

export default userRouter;