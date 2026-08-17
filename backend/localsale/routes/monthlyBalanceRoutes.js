import express from 'express';
import { getBalance, manualUpdateBM } from '../controllers/monthlyBalanceController.js';

const monthlyBalanceRouter = express.Router();

monthlyBalanceRouter.get('/', getBalance);
monthlyBalanceRouter.post('/update-bm', manualUpdateBM);

export default monthlyBalanceRouter;