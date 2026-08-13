import express from 'express';
import {
    createTeaReceivedRecord, 
    getTeaReceivedRecords,
    deleteTeaReceivedRecord,
    updateTeaReceivedRecord
} from '../controllers/TeaReceivedController.js'; 

import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const teaReceivedRouter = express.Router();

// ==========================================
// 🌟 Tea Received Entry Route
// ==========================================
// POST: Create tea received entry (Admins and Users only)
teaReceivedRouter.post('/manual', verifyToken, authorizeRoles('Admin', 'User'), createTeaReceivedRecord);

// ==========================================
// 🌟 Base & ID Routes
// ==========================================
// GET: View all tea received records (Admins, Users, and Viewers can view)
teaReceivedRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getTeaReceivedRecords); 

// PUT: Update record (Admins and Users only)
teaReceivedRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateTeaReceivedRecord); 

// DELETE: Remove record (Admin ONLY)
teaReceivedRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteTeaReceivedRecord);

export default teaReceivedRouter;