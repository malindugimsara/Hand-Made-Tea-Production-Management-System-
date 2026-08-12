import express from 'express';
import { saveDailyLedger, getLedgerData, deleteLedgerRow } from '../controller/factoryPackController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js'; 

const factoryPackRouter = express.Router();

// POST: Add or edit a day's record (Admins and Users only)
factoryPackRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveDailyLedger);

// GET: Fetch the list of records (Admins, Users, and Viewers can view)
factoryPackRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getLedgerData);

// DELETE: Remove a specific record (Admin ONLY)
factoryPackRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteLedgerRow);

export default factoryPackRouter;