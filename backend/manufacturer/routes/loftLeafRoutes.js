import express from 'express';

import { saveFactorySample, saveCollectorSample, getDailyReport, deleteRecord, updateRecord } from '../controllers/loftLeafController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';
const factoryLoftLeafRouter = express.Router();
// Define routes
factoryLoftLeafRouter.post('/factory',verifyToken, authorizeRoles('Admin', 'User'), saveFactorySample);
factoryLoftLeafRouter.post('/collector',verifyToken, authorizeRoles('Admin', 'User'), saveCollectorSample);
factoryLoftLeafRouter.get('/report', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getDailyReport);
factoryLoftLeafRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateRecord); // Edit Function 
factoryLoftLeafRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteRecord); // Delete Function 
export default factoryLoftLeafRouter;

