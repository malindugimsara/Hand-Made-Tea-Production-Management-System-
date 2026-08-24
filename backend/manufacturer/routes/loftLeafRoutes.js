import express from 'express';

import { saveFactorySample, saveCollectorSample, getDailyReport, deleteRecord, updateRecord } from '../controllers/loftLeafController.js';
const factoryLoftLeafRouter = express.Router();
// Define routes
factoryLoftLeafRouter.post('/factory', saveFactorySample);
factoryLoftLeafRouter.post('/collector', saveCollectorSample);
factoryLoftLeafRouter.get('/report', getDailyReport);
factoryLoftLeafRouter.put('/:id', updateRecord); // Edit Function 
factoryLoftLeafRouter.delete('/:id', deleteRecord); // Delete Function 
export default factoryLoftLeafRouter;