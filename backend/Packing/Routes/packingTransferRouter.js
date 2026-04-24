import express from 'express';
import { getCompletedTransfers, getPendingTransfersForPacking, receiveTransferInPacking } from '../controllers/packingTransferController.js';
import { verifyToken } from '../../middleware/auth.js';

const packingTransferRouter = express.Router();

packingTransferRouter.use(verifyToken); // Ensure user is authenticated for all routes in this router
// GET /api/packing/transfers/pending
packingTransferRouter.get('/pending', getPendingTransfersForPacking);

// PUT /api/packing/transfers/:id/receive
packingTransferRouter.put('/:id/receive', receiveTransferInPacking);
packingTransferRouter.get('/completed', getCompletedTransfers);

export default packingTransferRouter;