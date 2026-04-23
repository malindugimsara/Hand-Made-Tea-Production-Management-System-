import express from 'express';
import {
    createGuideIssue,
    getGuideIssues,
    deleteGuideIssue,
    updateGuideIssue
} from '../controllers/GuideIssueController.js';

const guideIssueRouter = express.Router();

// Base route: /api/guide-issues
guideIssueRouter.route('/')
    .post(createGuideIssue)
    .get(getGuideIssues);

// ID route: /api/guide-issues/:id
guideIssueRouter.route('/:id')
    .delete(deleteGuideIssue)
    .put(updateGuideIssue) // Add this later if you create an edit page

export default guideIssueRouter;