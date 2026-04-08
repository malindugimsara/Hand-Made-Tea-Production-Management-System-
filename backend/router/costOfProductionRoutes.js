// costOfProductionRoutes.js
import express from 'express';
import { saveCostOfProduction, getCostOfProductionByMonth } from '../controller/costOfProductionController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const costOfProductionRouter = express.Router();

// POST: Save or Update
costOfProductionRouter.post('/', verifyToken, authorizeRoles('Admin', 'Officer'), saveCostOfProduction);

// GET: Fetch by Month (URL එකේ අගට මාසය එනවා)
costOfProductionRouter.get('/:month', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getCostOfProductionByMonth);

export default costOfProductionRouter;