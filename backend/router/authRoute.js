import express from 'express';
import { loginUser, logoutUser, registerUser } from '../controller/authController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const authRouter = express.Router();

// Public Route: Anyone can try to log in
authRouter.post('/', loginUser);
authRouter.post('/register', registerUser);
authRouter.post('/logout', logoutUser);


export default authRouter;