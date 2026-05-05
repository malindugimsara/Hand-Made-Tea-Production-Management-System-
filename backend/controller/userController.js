import User from '../models/User.js';

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Server error fetching users." });
  }
};

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken." });
    }

    const newUser = new User({ username, password, role });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error while creating user." });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { username, role, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (username) user.username = username;
    if (role) user.role = role;

    // FIX: only set password if exists
    if (password && password.trim() !== '') {
      user.password = password;
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

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted successfully." });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Error deleting user." });
  }
};