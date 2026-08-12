import express from 'express';
import { 
    createProduction, 
    deleteProduction, 
    getProductionSummary, 
    updateProduction 
} from '../controller/productionController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const productionRouter = express.Router();

productionRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createProduction);

// GET route එකට Viewer ව දානවා
productionRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getProductionSummary);

productionRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateProduction);

// DELETE route එක Admin ට පමණක් සීමා කරනවා
productionRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteProduction);

export default productionRouter;