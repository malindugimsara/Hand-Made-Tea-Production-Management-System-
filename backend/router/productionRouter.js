import express from 'express';
import { createProduction, deleteProduction, getProductionSummary, updateProduction } from '../controller/productionController.js';


const productionRouter = express.Router();

productionRouter.post('/', createProduction);
productionRouter.get('/', getProductionSummary);
productionRouter.put('/:id', updateProduction);
productionRouter.delete('/:id', deleteProduction);


export default productionRouter;