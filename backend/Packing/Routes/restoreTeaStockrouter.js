import express from 'express';
import { restoreTeaStock } from '../controllers/restoreTeaStockController.js';


const restoreTeaStockRouter = express.Router();

restoreTeaStockRouter.post('/restore', restoreTeaStock);

export default restoreTeaStockRouter;