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
// Description: Save new record (Admin සහ Officer ට පමණක්)
rawMaterialCostRoutes.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createRawMaterialCost);

// Route: GET /api/raw-material-cost
// Description: Get all records (Admin, Officer, සහ Viewer ට)
rawMaterialCostRoutes.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllRawMaterialCosts);

// Route: PUT /api/raw-material-cost/:id
// Description: Update a specific record (Admin සහ Officer ට පමණක්)
rawMaterialCostRoutes.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateRawMaterialCost);

// Route: DELETE /api/raw-material-cost/:id
// Description: Delete a specific record (Admin සහ Officer ට පමණක්)
rawMaterialCostRoutes.delete('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), deleteRawMaterialCost);

export default rawMaterialCostRoutes;