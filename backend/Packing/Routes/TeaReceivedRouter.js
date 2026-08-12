import express from 'express';
import {
    getPendingTransfers,
    acceptTransfer,
    createTeaReceivedRecord, 
    getTeaReceivedRecords,
    deleteTeaReceivedRecord,
    updateTeaReceivedRecord,
    rejectTransfer,
    getRejectedTransfers
} from '../controllers/TeaReceivedController.js'; 
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම

const teaReceivedRouter = express.Router();

// ==========================================
// 🌟 Factory Pending Transfers Routes (Factory එකෙන් එන ඒවා සඳහා)
// ==========================================
// GET: View pending transfers (Admins, Users, and Viewers can view)
teaReceivedRouter.get('/pending', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getPendingTransfers);

// POST: Accept transfer (Admins and Users only)
teaReceivedRouter.post('/accept', verifyToken, authorizeRoles('Admin', 'User'), acceptTransfer);

// ==========================================
// 🌟 Manual Entry Route (අතින් දාන Receipts සඳහා)
// ==========================================
// POST: Create manual entry (Admins and Users only)
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

// POST: Reject transfer (Admins and Users only)
teaReceivedRouter.post('/reject', verifyToken, authorizeRoles('Admin', 'User'), rejectTransfer);

// GET: View rejected transfers (Admins, Users, and Viewers can view)
teaReceivedRouter.get('/rejected-transfers', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRejectedTransfers); 

export default teaReceivedRouter;