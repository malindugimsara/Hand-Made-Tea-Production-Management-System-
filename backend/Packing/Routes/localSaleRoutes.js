import express from 'express';
import {
    createLocalSale,
    getLocalSales,
    updateLocalSale,
    deleteLocalSale
} from '../controllers/localSaleController.js';

// Import your authentication middleware
// Adjust the path and import name based on your actual auth middleware file
// import authjwt from '../middleware/authjwt.js'; 

const router = express.Router();

// Option A: If you want to protect ALL routes in this file, uncomment the line below:
// router.use(authjwt);

/**
 * @route   /api/local-sales
 */
router.route('/')
    .get(getLocalSales)    // Or .get(authjwt, getLocalSales) if protecting individually
    .post(createLocalSale);

/**
 * @route   /api/local-sales/:id
 */
router.route('/:id')
    .put(updateLocalSale)
    .delete(deleteLocalSale);

export default router;