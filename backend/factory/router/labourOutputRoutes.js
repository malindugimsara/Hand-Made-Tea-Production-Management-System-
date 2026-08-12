import express from 'express';
import {
    getLabourOutputs, 
    saveLabourOutput,
    deleteLabourLogsByDate, 
    updateLabourOutputByDate
}  from '../controller/labourOutputController.js';

// Authentication සහ Role-based Authorization Middlewares Import කිරීම
import { verifyToken, authorizeRoles } from '../../middleware/auth.js'; 

const labourOutputRouter = express.Router();

// DELETE: Remove records by date (Admin ONLY) - Put this FIRST
labourOutputRouter.delete('/date/:date', verifyToken, authorizeRoles('Admin', 'User'), deleteLabourLogsByDate); 

// POST: Save labour output (Admins and Users only)
labourOutputRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveLabourOutput);

// GET: View labour outputs (Admins, Users, and Viewers can view)
labourOutputRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getLabourOutputs);

// PUT: Update records by date (Admins and Users only)
labourOutputRouter.put('/date/:date', verifyToken, authorizeRoles('Admin', 'User'), updateLabourOutputByDate);

export default labourOutputRouter;