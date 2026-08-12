import express from 'express';
import {
    getAllPackingStocks,
    getPackingStockById,
    createPackingStock,
    updatePackingStock,
    deletePackingStock
} from '../controllers/packingStockController.js'; 

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js'; 

const packingStockRouter = express.Router();

// GET: View all packing stocks (Admins, Users, and Viewers can view)
packingStockRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllPackingStocks);

// POST: Create new packing stock (Admins and Users only)
packingStockRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createPackingStock);

// GET: View single packing stock by ID (Admins, Users, and Viewers can view)
packingStockRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getPackingStockById);

// PUT: Edit existing packing stock (Admins and Users only)
packingStockRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updatePackingStock);

// DELETE: Remove packing stock (Admin ONLY)
packingStockRouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deletePackingStock);

export default packingStockRouter;