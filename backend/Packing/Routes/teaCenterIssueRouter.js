import express from 'express';
import {
    createTeaCenterIssue,
    deleteTeaCenterIssue,
    getTeaCenterIssues,
    updateTeaCenterIssue
} from '../controllers/TeaCenterIssueController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම

const teaCenterIssueRouter = express.Router();

// GET: View all records (Admins, Users, and Viewers can view)
teaCenterIssueRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getTeaCenterIssues);

// POST: Add new records (Admins and Users only)
teaCenterIssueRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createTeaCenterIssue);

// PUT: Edit existing records (Admins and Users only)
teaCenterIssueRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateTeaCenterIssue);

// DELETE: Remove records (Admin ONLY)
teaCenterIssueRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteTeaCenterIssue);

export default teaCenterIssueRouter;