import express from 'express';
import { saveBulkSummaries, getAllSummaries } from '../controllers/dailySummaryController.js';

const dailySummaryRouter = express.Router();

// Route: POST /api/summary/bulk-save
dailySummaryRouter.post('/bulk-save', saveBulkSummaries);

// Route: GET /api/summary/
dailySummaryRouter.get('/', getAllSummaries);

export default dailySummaryRouter;