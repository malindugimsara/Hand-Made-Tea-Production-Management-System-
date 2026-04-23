import express from 'express';
import { 
    saveProductionSummary, 
    getAllProductionSummaries,
    deleteProductionSummary 
} from '../controller/productionSummaryController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const productionSummaryRouter = express.Router();

// Everyone can view the summaries
productionSummaryRouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllProductionSummaries);

// Only Admins and Officers can save/update the summaries
productionSummaryRouter.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), saveProductionSummary);

// Only Admins can delete a summary record
productionSummaryRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteProductionSummary);

export default productionSummaryRouter;