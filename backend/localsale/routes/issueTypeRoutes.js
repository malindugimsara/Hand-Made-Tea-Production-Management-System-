import express from 'express';
import { saveIssueTypeSummaries, getIssueTypeSummaries } from '../controllers/issueTypeController.js';

const issueTypeRouter = express.Router();

issueTypeRouter.post('/bulk-save', saveIssueTypeSummaries);
issueTypeRouter.get('/', getIssueTypeSummaries);

export default issueTypeRouter;