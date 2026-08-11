import express from 'express';
import { saveIssueTypeSummaries, getIssueTypeSummaries, updateIssueTypeItem, deleteIssueTypeItem } from '../controllers/issueTypeController.js';

const issueTypeRouter = express.Router();

issueTypeRouter.post('/bulk-save', saveIssueTypeSummaries);
issueTypeRouter.get('/', getIssueTypeSummaries);
issueTypeRouter.put('/:recordId/item/:itemId', updateIssueTypeItem);
issueTypeRouter.delete('/:recordId/item/:itemId', deleteIssueTypeItem);
export default issueTypeRouter;