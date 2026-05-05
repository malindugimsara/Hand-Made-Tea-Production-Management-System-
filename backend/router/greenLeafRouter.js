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
greenLeafRouter.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createGreenLeaf);

// GET: View all records (Everyone logged in can view)
greenLeafRouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllGreenLeaf);

// PUT: Edit existing records (Admins and Officers only)
greenLeafRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateGreenLeaf);

// DELETE: Remove records (Admins and Officers)
greenLeafRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), deleteGreenLeaf);

export default greenLeafRouter;