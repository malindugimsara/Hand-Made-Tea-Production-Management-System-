import express from 'express';
import { 
    saveIssueTypeSummaries, 
    getIssueTypeSummaries, 
    updateIssueTypeItem, 
    deleteIssueTypeItem 
} from '../controllers/issueTypeController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';

const issueTypeRouter = express.Router();

// POST: Save bulk issue type summaries (Admins and Users only)
issueTypeRouter.post('/bulk-save', verifyToken, authorizeRoles('Admin', 'User'), saveIssueTypeSummaries);

// GET: View issue type summaries (Admins, Users, and Viewers can view)
issueTypeRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getIssueTypeSummaries);

// PUT: Edit specific issue type item (Admins and Users only)
issueTypeRouter.put('/:recordId/item/:itemId', verifyToken, authorizeRoles('Admin', 'User'), updateIssueTypeItem);

// DELETE: Remove specific issue type item (Admin ONLY)
issueTypeRouter.delete('/:recordId/item/:itemId', verifyToken, authorizeRoles('Admin'), deleteIssueTypeItem);

export default issueTypeRouter;