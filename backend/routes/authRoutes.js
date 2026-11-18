import express from 'express';
import { loginUser, registerUser, logoutUser } from '../controllers/authController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const authRouter = express.Router();

// Public Route: Anyone can try to log in (Protected with Rate Limiter against Brute Force attacks)
authRouter.post('/login', loginLimiter, loginUser);

// Protected Route: ONLY logged-in users with the 'Admin' role can register new users
authRouter.post(
  '/register', 
  verifyToken, 
  authorizeRoles('Admin'), 
  registerUser
);

// Protected Route: Invalidate current user token and terminate session
authRouter.post('/logout', verifyToken, logoutUser);

export default authRouter;