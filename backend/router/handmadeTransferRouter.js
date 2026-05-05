import express from 'express';
import { createHandmadeTransfer, getHandmadeTransfersHistory, getStockSummary, getTransOutRecords } from '../controller/handmadeTransferController.js';
import { verifyToken } from '../middleware/auth.js';


const handmadeTransferRouter = express.Router();

// handmadeTransferRouter.use(authjwt); // Uncomment to protect routes
handmadeTransferRouter.use(verifyToken); // Ensure user is authenticated for all routes in this router

// POST /api/handmade/transfers
handmadeTransferRouter.post('/', createHandmadeTransfer);
handmadeTransferRouter.get('/stock-summary', getStockSummary);
handmadeTransferRouter.get('/out', getTransOutRecords)
handmadeTransferRouter.get('/history', getHandmadeTransfersHistory);
export default handmadeTransferRouter;