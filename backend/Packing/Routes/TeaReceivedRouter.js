import express from 'express';
import {
    getPendingTransfers,
    acceptTransfer,
    createTeaReceivedRecord, // 🌟 Manual Entry Function එක import කරන්න
    getTeaReceivedRecords,
    deleteTeaReceivedRecord,
    updateTeaReceivedRecord,
    rejectTransfer,
    getRejectedTransfers
} from '../controllers/TeaReceivedController.js'; 

const teaReceivedRouter = express.Router();

// ==========================================
// 🌟 Factory Pending Transfers Routes (Factory එකෙන් එන ඒවා සඳහා)
// ==========================================
teaReceivedRouter.get('/pending', getPendingTransfers);
teaReceivedRouter.post('/accept', acceptTransfer);

// ==========================================
// 🌟 Manual Entry Route (අතින් දාන Receipts සඳහා)
// ==========================================
teaReceivedRouter.post('/manual', createTeaReceivedRecord);

// ==========================================
// 🌟 Base & ID Routes
// ==========================================
// Base route: /api/tea-received
teaReceivedRouter.route('/')
    .get(getTeaReceivedRecords); 
    // මෙතන .post එක අවශ්‍ය නැහැ, මොකද අපි Manual එකට /manual පාවිච්චි කරන නිසා.

// ID route: /api/tea-received/:id
teaReceivedRouter.route('/:id')
    .delete(deleteTeaReceivedRecord)
    .put(updateTeaReceivedRecord); 

teaReceivedRouter.post('/reject', rejectTransfer);
teaReceivedRouter.get('/rejected-transfers', getRejectedTransfers); // Get Rejected Transfers

export default teaReceivedRouter;