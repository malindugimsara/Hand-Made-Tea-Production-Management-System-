import express from 'express';
import { getOrCalculateBalance, closeMonth } from '../controllers/monthlyBalanceController.js';
// import { protect } from '../middleware/authMiddleware.js'; // Adjust path

const monthlyBalanceRouter = express.Router();

// Apply auth middleware to protect these routes
// router.use(protect); 

// GET request to fetch or calculate the report
monthlyBalanceRouter.get('/', getOrCalculateBalance);

// POST request to permanently lock the month
monthlyBalanceRouter.post('/close', closeMonth);

export default monthlyBalanceRouter;