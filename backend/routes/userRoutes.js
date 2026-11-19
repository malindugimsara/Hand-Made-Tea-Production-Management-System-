import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET ALL USERS
router.get('/', verifyToken, authorizeRoles('Admin'), getAllUsers);

// CREATE USER (Supports both /api/users/register and standard RESTful POST /api/users)
router.post('/register', verifyToken, authorizeRoles('Admin'), createUser);
router.post('/', verifyToken, authorizeRoles('Admin'), createUser);

// UPDATE USER
router.put('/:id', verifyToken, authorizeRoles('Admin'), updateUser);

// DELETE USER
router.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteUser);

export default router;