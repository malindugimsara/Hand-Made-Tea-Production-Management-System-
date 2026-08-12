import express from 'express';
import { getCompletedTransfers, getPendingTransfersForPacking, receiveTransferInPacking } from '../controllers/packingTransferController.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';

const packingTransferRouter = express.Router();

// Ensure user is authenticated for all routes in this router
packingTransferRouter.use(verifyToken); 

// GET /api/packing/transfers/pending - Viewable by Admin, User, and Viewer
packingTransferRouter.get('/pending', authorizeRoles('Admin', 'User', 'Viewer'), getPendingTransfersForPacking);

// GET /api/packing/transfers/completed - Viewable by Admin, User, and Viewer
packingTransferRouter.get('/completed', authorizeRoles('Admin', 'User', 'Viewer'), getCompletedTransfers);

// PUT /api/packing/transfers/:id/receive - Receiving transfers (Admins and Users only)
packingTransferRouter.put('/:id/receive', authorizeRoles('Admin', 'User'), receiveTransferInPacking);

export default packingTransferRouter;