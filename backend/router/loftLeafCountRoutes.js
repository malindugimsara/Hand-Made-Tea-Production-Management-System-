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


loftLeafrouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllLoftLeafCounts);

loftLeafrouter.get('/summary', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getMonthlyRouteSummary);

loftLeafrouter.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createLoftLeafCount);

loftLeafrouter.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateLoftLeafCount);

loftLeafrouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLoftLeafCount);

export default loftLeafrouter;