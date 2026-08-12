import express from 'express';
import { 
    saveBulkSummaries, 
    getAllSummaries, 
    updateSummaryItem, 
    deleteSummaryItem 
} from '../controllers/dailySummaryController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';

const dailySummaryRouter = express.Router();

// POST: Add new bulk summaries (Admins and Users only)
dailySummaryRouter.post('/bulk-save', verifyToken, authorizeRoles('Admin', 'User'), saveBulkSummaries);

// GET: View all summaries (Admins, Users, and Viewers can view)
dailySummaryRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllSummaries);

// PUT: Edit specific summary item (Admins and Users only)
dailySummaryRouter.put('/:recordId/item/:itemId', verifyToken, authorizeRoles('Admin', 'User'), updateSummaryItem);

// DELETE: Remove specific summary item (Admin ONLY)
dailySummaryRouter.delete('/:recordId/item/:itemId', verifyToken, authorizeRoles('Admin'), deleteSummaryItem);

export default dailySummaryRouter;