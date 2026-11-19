import express from 'express';
import { loginUser, logoutUser } from '../controllers/authController.js';
import { createUser } from '../controllers/userController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const authRouter = express.Router();

// Public Route: Anyone can try to log in (Protected with Rate Limiter against Brute Force attacks)
authRouter.post('/login', loginLimiter, loginUser);

// Protected Route: Invalidate current user token and terminate session
authRouter.post('/logout', verifyToken, logoutUser);

// Consolidated Route: Forward legacy /api/auth/register calls to createUser in userController for backward compatibility
authRouter.post(
  '/register', 
  verifyToken, 
  authorizeRoles('Admin', 'Developer'), 
  createUser
);

export default authRouter;