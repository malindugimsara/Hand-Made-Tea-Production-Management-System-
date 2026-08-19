import express from 'express';

import { saveFactorySample, saveCollectorSample, getDailyReport, deleteRecord } from '../controllers/loftLeafController.js';
const factoryLoftLeafRouter = express.Router();
// Define routes
factoryLoftLeafRouter.post('/factory', saveFactorySample);
factoryLoftLeafRouter.post('/collector', saveCollectorSample);
factoryLoftLeafRouter.get('/report', getDailyReport);
factoryLoftLeafRouter.delete('/record/:id', deleteRecord);

export default factoryLoftLeafRouter;