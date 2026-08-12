// costOfProductionRoutes.js
import express from 'express';
import { saveCostOfProduction, getCostOfProductionByMonth } from '../controller/costOfProductionController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const costOfProductionRouter = express.Router();

// POST: Save or Update
costOfProductionRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveCostOfProduction);

// GET: Fetch by Month 
costOfProductionRouter.get('/:month', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getCostOfProductionByMonth);

export default costOfProductionRouter;