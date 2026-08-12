import express from 'express';
import { restoreTeaStock } from '../controllers/restoreTeaStockController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';


const restoreTeaStockRouter = express.Router();

restoreTeaStockRouter.post('/restore',verifyToken, authorizeRoles('Admin'), restoreTeaStock);

export default restoreTeaStockRouter;