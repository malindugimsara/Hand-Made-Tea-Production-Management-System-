import express from 'express';
import {
    createLocalSale,
    getLocalSales,
    updateLocalSale,
    deleteLocalSale
} from '../controllers/localSaleController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const localSaleRouter = express.Router();

// POST: Add new records (Admins and Users only)
localSaleRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createLocalSale);

// GET: View all records (Admins, Users, and Viewers can view)
localSaleRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getLocalSales);

// PUT: Edit existing records (Admins and Users only)
localSaleRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateLocalSale);

// DELETE: Remove records (Admin ONLY)
localSaleRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLocalSale);

export default localSaleRouter;