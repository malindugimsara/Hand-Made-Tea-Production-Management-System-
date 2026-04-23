import express from 'express';
import { createProduction, deleteProduction, getProductionSummary, updateProduction } from '../controller/productionController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 


const productionRouter = express.Router();

productionRouter.post('/',verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createProduction);
productionRouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getProductionSummary);
productionRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateProduction);
productionRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), deleteProduction);


export default productionRouter;