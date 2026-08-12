import express from 'express';
import { deleteFactoryLog, getFactoryLogsByMonth, saveDailyFactoryLog } from '../controller/factoryController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js'; 

const factoryrouter = express.Router();

// GET: View logs (Admins, Users, and Viewers can view)
factoryrouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getFactoryLogsByMonth);

// POST: Save daily factory log (Admins and Users only)
factoryrouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveDailyFactoryLog);

// DELETE: Remove factory log (Admin ONLY)
factoryrouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteFactoryLog); 

export default factoryrouter;