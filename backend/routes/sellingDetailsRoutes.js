import express from 'express';
import { 
    createSellingDetail, 
    getSellingDetailsByMonth 
} from '../controllers/sellingDetailsController.js'; // 

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const sellingDetailsRouter = express.Router();

sellingDetailsRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createSellingDetail);

// API Endpoint: /api/selling-details?month=YYYY-MM
sellingDetailsRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getSellingDetailsByMonth);

export default sellingDetailsRouter;