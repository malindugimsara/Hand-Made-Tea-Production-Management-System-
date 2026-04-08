import express from 'express';
import { 
    createSellingDetail, 
    getSellingDetailsByMonth 
} from '../controller/sellingDetailsController.js'; // 

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const sellingDetailsRouter = express.Router();

sellingDetailsRouter.post('/', verifyToken, authorizeRoles('Admin', 'Officer'), createSellingDetail);

// API Call එක: /api/selling-details?month=YYYY-MM
sellingDetailsRouter.get('/', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getSellingDetailsByMonth);

export default sellingDetailsRouter;