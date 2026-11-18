import express from 'express';
import { 
    createRawMaterialCost, 
    deleteRawMaterialCost, 
    getAllRawMaterialCosts, 
    updateRawMaterialCost 
} from '../controller/rawMaterialCostController.js';

// Auth middleware එක Import කිරීම
import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const rawMaterialCostRoutes = express.Router();

// Route: POST /api/raw-material-cost
// Description: Save new record (Admin සහ User ට පමණක්)
rawMaterialCostRoutes.post('/', verifyToken, authorizeRoles('Admin', 'User'), createRawMaterialCost);

// Route: GET /api/raw-material-cost
// Description: Get all records (Admin, User, සහ Viewer ට)
rawMaterialCostRoutes.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllRawMaterialCosts);

// Route: PUT /api/raw-material-cost/:id
// Description: Update a specific record (Admin සහ User ට පමණක්)
rawMaterialCostRoutes.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateRawMaterialCost);

// Route: DELETE /api/raw-material-cost/:id
// Description: Delete a specific record (Admin සහ User ට පමණක්)
rawMaterialCostRoutes.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteRawMaterialCost);

export default rawMaterialCostRoutes;