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

const localSaleRouter = express.Router();

// Option A: If you want to protect ALL routes in this file, uncomment the line below:
// localSaleRouter.use(authjwt);

/**
 * @route   /api/local-sales
 */
localSaleRouter.route('/')
    .get(getLocalSales)    // Or .get(authjwt, getLocalSales) if protecting individually
    .post(createLocalSale);

/**
 * @route   /api/local-sales/:id
 */
localSaleRouter.route('/:id')
    .put(updateLocalSale)
    .delete(deleteLocalSale);

export default localSaleRouter;