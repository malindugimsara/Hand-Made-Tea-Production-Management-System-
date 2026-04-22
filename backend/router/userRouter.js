import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controller/userController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET ALL USERS
router.get('/', verifyToken, authorizeRoles('Admin'), getAllUsers);

// CREATE USER
router.post('/register', verifyToken, authorizeRoles('Admin'), createUser);

// UPDATE USER
router.put('/:id', verifyToken, authorizeRoles('Admin'), updateUser);

// DELETE USER
router.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteUser);

export default router;