import express from 'express';
import { getCompletedTransfers, getPendingTransfersForPacking, receiveTransferInPacking } from '../controllers/packingTransferController.js';
// import authjwt from '../middleware/authjwt.js'; 

const packingTransferRouter = express.Router();

// router.use(authjwt); // Uncomment to protect routes

// GET /api/packing/transfers/pending
packingTransferRouter.get('/pending', getPendingTransfersForPacking);

// PUT /api/packing/transfers/:id/receive
packingTransferRouter.put('/:id/receive', receiveTransferInPacking);
packingTransferRouter.get('/completed', getCompletedTransfers);

export default packingTransferRouter;