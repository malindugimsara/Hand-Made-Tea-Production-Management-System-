import express from 'express';
import { 
    createTransaction, 
    deleteTransaction, 
    getAllTransactions, 
    getTransactionById, 
    updateTransaction 
} from '../controllers/teaTransactionOtherController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';
const teaTransactionOtherRouter = express.Router();

// POST: Create transaction (Admins and Users only)
teaTransactionOtherRouter.post('/create', verifyToken, authorizeRoles('Admin', 'User'), createTransaction);        

// GET: View all transactions (Admins, Users, and Viewers can view)
teaTransactionOtherRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllTransactions);             

// GET: View transaction by ID (Admins, Users, and Viewers can view)
teaTransactionOtherRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getTransactionById);            

// PUT: Update transaction (Admins and Users only)
teaTransactionOtherRouter.put('/update/:id', verifyToken, authorizeRoles('Admin', 'User'), updateTransaction);      

// DELETE: Remove transaction (Admin ONLY)
teaTransactionOtherRouter.delete('/delete/:id', verifyToken, authorizeRoles('Admin'), deleteTransaction);   

export default teaTransactionOtherRouter;