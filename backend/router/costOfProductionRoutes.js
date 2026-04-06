import express from 'express';
import { getCostOfProductionByMonth, saveCostOfProduction } from '../controller/costOfProductionController.js';


const costOfProductionRouter = express.Router();

// Route: POST /api/cost-of-production
// Description: Save or Update monthly cost data
costOfProductionRouter.post('/', saveCostOfProduction);

// Route: GET /api/cost-of-production/:month
// Description: Get cost data for a specific month (e.g., /api/cost-of-production/2026-04)
costOfProductionRouter.get('/:month', getCostOfProductionByMonth);

export default costOfProductionRouter;
