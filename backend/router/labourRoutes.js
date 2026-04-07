import express from 'express';
import { 
    createLabour, 
    deleteLabour, 
    getAllLabour, 
    updateLabour 
} from '../controller/labourController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const labourRouter = express.Router();

// POST: Add new labour records (Admins and Officers only)
labourRouter.post('/', verifyToken, authorizeRoles('Admin', 'Officer'), createLabour);

// GET: View all labour records (Admins, Officers, and Viewers)
labourRouter.get('/', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getAllLabour);

// PUT: Edit existing labour records (Admins and Officers only)
labourRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), updateLabour);

// DELETE: Remove labour records (Admins and Officers)
labourRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), deleteLabour);

export default labourRouter;