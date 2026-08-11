import express from 'express';
import { saveBulkSummaries, getAllSummaries, updateSummaryItem, deleteSummaryItem } from '../controllers/dailySummaryController.js';

const dailySummaryRouter = express.Router();

// Route: POST /api/summary/bulk-save
dailySummaryRouter.post('/bulk-save', saveBulkSummaries);

// Route: GET /api/summary/
dailySummaryRouter.get('/', getAllSummaries);
// Route: PUT /api/summary/:recordId/item/:itemId (Edit Item)
dailySummaryRouter.put('/:recordId/item/:itemId', updateSummaryItem);

// Route: DELETE /api/summary/:recordId/item/:itemId (Delete Item)
dailySummaryRouter.delete('/:recordId/item/:itemId', deleteSummaryItem);

export default dailySummaryRouter;