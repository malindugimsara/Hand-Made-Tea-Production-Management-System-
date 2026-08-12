import express from 'express';
import { 
    adjustStock, 
    deleteStockAdjustment, 
    getSingleStockAdjustment, 
    getStockAdjustmentLogs, 
    updateStockAdjustment 
} from '../controllers/stockAdjustmentController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const StockAdjustmentRouter = express.Router();

// POST: Adjust stock directly (Admins and Users only)
StockAdjustmentRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), adjustStock);

// GET: View the history/logs (Admins, Users, and Viewers can view)
StockAdjustmentRouter.get('/logs', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getStockAdjustmentLogs);

// GET: View single stock adjustment by ID (Admins, Users, and Viewers can view)
StockAdjustmentRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getSingleStockAdjustment);

// PUT: Update an adjustment record (Admins and Users only)
StockAdjustmentRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateStockAdjustment);

// DELETE: Remove an adjustment record (Admin ONLY)
StockAdjustmentRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteStockAdjustment);

export default StockAdjustmentRouter;