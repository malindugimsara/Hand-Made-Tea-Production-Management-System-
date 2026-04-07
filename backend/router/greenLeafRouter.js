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

// POST: Add new records (Admins and Officers only)
greenLeafRouter.post('/', verifyToken, authorizeRoles('Admin', 'Officer'), createGreenLeaf);

// GET: View all records (Everyone logged in can view)
greenLeafRouter.get('/', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getAllGreenLeaf);

// PUT: Edit existing records (Admins and Officers only)
greenLeafRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), updateGreenLeaf);

// DELETE: Remove records (Admins and Officers)
greenLeafRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), deleteGreenLeaf);

export default greenLeafRouter;