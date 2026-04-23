import express from 'express';
import { createHandmadeTransfer } from '../controller/handmadeTransferController.js';
// import authjwt from '../middleware/authjwt.js'; 

const handmadeTransferRouter = express.Router();

// handmadeTransferRouter.use(authjwt); // Uncomment to protect routes

// POST /api/handmade/transfers
handmadeTransferRouter.post('/', createHandmadeTransfer);

export default handmadeTransferRouter;