import express from 'express';
import { 
    createLabour, 
    deleteLabour, 
    getAllLabour, 
    updateLabour 
} from '../controller/labourController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const labourRouter = express.Router();

// POST: Add new labour records (Admins and Users only)
labourRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createLabour);

// GET: View all labour records (Admins, Users, and Viewers)
labourRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllLabour);

// PUT: Edit existing labour records (Admins and Users only)
labourRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateLabour);

// DELETE: Remove labour records (Admin ONLY)
labourRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLabour);

export default labourRouter;