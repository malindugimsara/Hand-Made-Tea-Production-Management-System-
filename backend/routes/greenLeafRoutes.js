import express from 'express';
import { 
    createGreenLeaf, 
    deleteGreenLeaf, 
    getAllGreenLeaf, 
    updateGreenLeaf 
} from '../controller/greenLeafController.js';

// Import your middleware
import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const greenLeafRouter = express.Router();

// POST: Add new records (Admins and Users only)
greenLeafRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createGreenLeaf);

// GET: View all records (Admins, Users, and Viewers can view)
greenLeafRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllGreenLeaf);

// PUT: Edit existing records (Admins and Users only)
greenLeafRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateGreenLeaf);

// DELETE: Remove records (Admin ONLY)
greenLeafRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteGreenLeaf);

export default greenLeafRouter;