import express from 'express';
import {
    getAllPackingStocks,
    getPackingStockById,
    createPackingStock,
    updatePackingStock,
    deletePackingStock
} from '../controllers/packingStockController.js'; // Adjust path as needed

// If you have auth middleware, import it here:
// import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes if needed:
// router.use(protect); 

const packingStockRouter = express.Router();

packingStockRouter.route('/')
    .get(getAllPackingStocks)
    .post(createPackingStock);

packingStockRouter.route('/:id')
    .get(getPackingStockById)
    .put(updatePackingStock)
    .delete(deletePackingStock);

export default packingStockRouter;