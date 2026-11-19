import User from '../models/User.js';

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      username: { $ne: 'devadmin' },
      role: { $nin: ['Developer', 'developer'] }
    }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Server error fetching users." });
  }
};

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { username, password, role, allowedPaths, allowedPages } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: "Invalid username or password format." });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters long." });
    }

    if (role === 'Developer' || trimmedUsername.toLowerCase() === 'devadmin') {
      return res.status(403).json({ message: "Cannot create Developer or devadmin account." });
    }

    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken." });
    }

    const newUser = new User({ 
        username: trimmedUsername, 
        password, 
        role: role || 'User',
        allowedPaths: Array.isArray(allowedPaths) ? allowedPaths : [],
        allowedPages: Array.isArray(allowedPages) ? allowedPages : []
    });
    
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username already taken." });
    }
    res.status(500).json({ message: "Server error while creating user." });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    // NEW: Extract allowedPages from req.body
    const { username, role, password, allowedPaths, allowedPages } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.username === 'devadmin' || user.role === 'Developer') {
      return res.status(403).json({ message: "Cannot modify devadmin or Developer account." });
    }

    if (role === 'Developer') {
      return res.status(403).json({ message: "Cannot assign Developer role." });
    }

    let securityChanged = false;

    if (username) user.username = username;
    if (role && role !== user.role) {
      user.role = role;
      securityChanged = true;
    }
    
    if (allowedPaths) {
      user.allowedPaths = allowedPaths;
      securityChanged = true;
    }
    
    // NEW: Save updated allowedPages when updating user
    if (allowedPages) {
      user.allowedPages = allowedPages; 
      securityChanged = true;
    }

    // FIX: only set password if exists
    if (password && password.trim() !== '') {
      user.password = password;
      securityChanged = true;
    }

    // Invalidate existing sessions if security-sensitive permissions/password changed
    if (securityChanged) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    res.status(200).json({ message: "User updated successfully." });

  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Username already taken." });
    }

    res.status(500).json({ message: "Error updating user." });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your currently logged-in account."
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.username === 'devadmin' || targetUser.role === 'Developer') {
      return res.status(403).json({ message: "Cannot delete Developer or devadmin account." });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted successfully." });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Error deleting user." });
  }
};