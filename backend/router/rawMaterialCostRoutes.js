import express from 'express';
import { createRawMaterialCost, deleteRawMaterialCost, getAllRawMaterialCosts, updateRawMaterialCost } from '../controller/rawMaterialCostController.js';


const rawMaterialCostRoutes = express.Router();

// Route: POST /api/raw-material-cost
// Description: Save new record
rawMaterialCostRoutes.post('/', createRawMaterialCost);

// Route: GET /api/raw-material-cost
// Description: Get all records
rawMaterialCostRoutes.get('/', getAllRawMaterialCosts);

// Route: DELETE /api/raw-material-cost/:id
// Description: Delete a specific record
rawMaterialCostRoutes.delete('/:id', deleteRawMaterialCost);

rawMaterialCostRoutes.put('/:id', updateRawMaterialCost);

export default rawMaterialCostRoutes;