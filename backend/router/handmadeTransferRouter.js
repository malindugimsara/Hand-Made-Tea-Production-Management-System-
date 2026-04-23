import express from 'express';
import { createHandmadeTransfer, getStockSummary } from '../controller/handmadeTransferController.js';
// import authjwt from '../middleware/authjwt.js'; 

const handmadeTransferRouter = express.Router();

// handmadeTransferRouter.use(authjwt); // Uncomment to protect routes

// POST /api/handmade/transfers
handmadeTransferRouter.post('/', createHandmadeTransfer);
handmadeTransferRouter.get('/stock-summary', getStockSummary);

export default handmadeTransferRouter;