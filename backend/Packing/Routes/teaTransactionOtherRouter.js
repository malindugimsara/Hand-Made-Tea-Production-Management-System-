import express from 'express';
import { createTransaction, deleteTransaction, getAllTransactions, getTransactionById, updateTransaction } from '../controllers/teaTransactionOtherController.js';

const teaTransactionOtherRouter = express.Router();

teaTransactionOtherRouter.post('/create', createTransaction);         // POST /api/tea-transactions/create
teaTransactionOtherRouter.get('/', getAllTransactions);               // GET /api/tea-transactions/
teaTransactionOtherRouter.get('/:id', getTransactionById);            // GET /api/tea-transactions/:id
teaTransactionOtherRouter.put('/update/:id', updateTransaction);      // PUT /api/tea-transactions/update/:id
teaTransactionOtherRouter.delete('/delete/:id', deleteTransaction);   // DELETE /api/tea-transactions/delete/:id

export default teaTransactionOtherRouter;