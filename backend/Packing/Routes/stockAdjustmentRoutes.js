import express from 'express';
import { adjustStock, deleteStockAdjustment, getSingleStockAdjustment, getStockAdjustmentLogs, updateStockAdjustment } from '../controllers/stockAdjustmentController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const StockAdjustmentRouter = express.Router();

// Only Admin or Managers should be able to adjust stock directly
StockAdjustmentRouter.post('/', verifyToken, authorizeRoles('Admin', 'Manager'), adjustStock);
// GET request - For viewing the history (මේක අලුතින් දාන්න)
StockAdjustmentRouter.get('/logs', verifyToken, getStockAdjustmentLogs);
// DELETE request - For removing an adjustment record
StockAdjustmentRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'Manager'), deleteStockAdjustment);
StockAdjustmentRouter.get('/:id', verifyToken, getSingleStockAdjustment);
StockAdjustmentRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'Manager'), updateStockAdjustment);
export default StockAdjustmentRouter;