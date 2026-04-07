import express from 'express';
import { loginUser, registerUser } from '../controller/authController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const authRouter = express.Router();

// Public Route: Anyone can try to log in
authRouter.post('/login', loginUser);

// Protected Route: ONLY logged-in users with the 'Admin' role can register new users
// authRouter.post(
//   '/register', 
//   verifyToken, 
//   authorizeRoles('Admin'), 
//   registerUser
// );

authRouter.post('/register', registerUser);


export default authRouter;