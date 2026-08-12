import express from 'express';
import { 
    createRawMaterialIn, 
    getAllRawMaterialInRecords, 
    getRawMaterialInById, 
    updateRawMaterialInRecord, 
    deleteRawMaterialInRecord,
    getRawMaterialStock
} from '../controllers/rawMaterialInController.js'; 

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js'; 

const rawMaterialInRouter = express.Router();

// GET routes (Admins, Users, and Viewers can view)
rawMaterialInRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllRawMaterialInRecords); 
rawMaterialInRouter.get('/stock', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRawMaterialStock);          
rawMaterialInRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRawMaterialInById);                  

// POST route (Admins and Users only)
rawMaterialInRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createRawMaterialIn);        

// PUT route (Admins and Users only)
rawMaterialInRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateRawMaterialInRecord);

// DELETE route (Admin ONLY)
rawMaterialInRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteRawMaterialInRecord); 

export default rawMaterialInRouter;