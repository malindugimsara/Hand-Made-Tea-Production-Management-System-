import express from 'express';
import { getBalance, manualUpdateBM } from '../controllers/monthlyBalanceController.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';

const monthlyBalanceRouter = express.Router();

monthlyBalanceRouter.get('/',verifyToken, authorizeRoles('Admin', 'User'), getBalance);
monthlyBalanceRouter.post('/update-bm',verifyToken, authorizeRoles('Admin', 'User'), manualUpdateBM);

export default monthlyBalanceRouter;