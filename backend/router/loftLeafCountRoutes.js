import express from 'express';
import {
    getAllLoftLeafCounts,
    createLoftLeafCount,
    updateLoftLeafCount,
    deleteLoftLeafCount,
    getMonthlyRouteSummary
} from '../controller/loftLeafCountController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const loftLeafrouter = express.Router();


loftLeafrouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllLoftLeafCounts);

loftLeafrouter.get('/summary', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getMonthlyRouteSummary);

loftLeafrouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createLoftLeafCount);

loftLeafrouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateLoftLeafCount);

loftLeafrouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLoftLeafCount);

export default loftLeafrouter;