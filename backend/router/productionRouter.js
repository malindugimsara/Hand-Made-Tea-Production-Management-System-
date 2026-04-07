import express from 'express';
import { createProduction, deleteProduction, getProductionSummary, updateProduction } from '../controller/productionController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 


const productionRouter = express.Router();

productionRouter.post('/',verifyToken, authorizeRoles('Admin', 'Officer'), createProduction);
productionRouter.get('/', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getProductionSummary);
productionRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), updateProduction);
productionRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), deleteProduction);


export default productionRouter;