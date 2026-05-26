import express from 'express';
import {
    getAllLoftLeafCounts,
    createLoftLeafCount,
    updateLoftLeafCount,
    deleteLoftLeafCount
} from '../controller/loftLeafCountController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const loftLeafrouter = express.Router();

// GET: Admin, HandMade Officer, සහ Viewer අයට දත්ත බැලිය හැක
loftLeafrouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllLoftLeafCounts);

// POST: අලුතින් දත්ත ඇතුළත් කළ හැක්කේ Admin සහ HandMade Officer ට පමණි
loftLeafrouter.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createLoftLeafCount);

// PUT: දත්ත Update කළ හැක්කේ ද Admin සහ HandMade Officer ට පමණි
loftLeafrouter.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateLoftLeafCount);

// DELETE: දත්ත Delete කිරීමේ බලය Admin ට පමණක් ලබා දීම වඩාත් ආරක්ෂිතයි
loftLeafrouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLoftLeafCount);

export default loftLeafrouter;