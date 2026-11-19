import express from 'express';
import { 
    createRawMaterialCost, 
    deleteRawMaterialCost, 
    getAllRawMaterialCosts, 
    updateRawMaterialCost 
} from '../controllers/rawMaterialCostController.js';

// Import authentication middleware
import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const rawMaterialCostRoutes = express.Router();

// Route: POST /api/raw-material-cost
// Description: Save new record (Restricted to Admin and User)
rawMaterialCostRoutes.post('/', verifyToken, authorizeRoles('Admin', 'User'), createRawMaterialCost);

// Route: GET /api/raw-material-cost
// Description: Get all records (Accessible by Admin, User, and Viewer)
rawMaterialCostRoutes.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllRawMaterialCosts);

// Route: PUT /api/raw-material-cost/:id
// Description: Update a specific record (Restricted to Admin and User)
rawMaterialCostRoutes.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateRawMaterialCost);

// Route: DELETE /api/raw-material-cost/:id
// Description: Delete a specific record (Restricted to Admin and User)
rawMaterialCostRoutes.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteRawMaterialCost);

export default rawMaterialCostRoutes;