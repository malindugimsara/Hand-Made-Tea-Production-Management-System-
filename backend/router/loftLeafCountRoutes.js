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
// Frontend Usage: 
// 1. ඔක්කොම ගන්න: GET /api/loftLeaf
// 2. Factory report එක ගන්න: GET /api/loftLeaf?sampleType=Factory
// 3. Leaf Collector report එක ගන්න: GET /api/loftLeaf?sampleType=LeafCollector
loftLeafrouter.get('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer', 'Viewer'), getAllLoftLeafCounts);

// POST: අලුතින් දත්ත ඇතුළත් කළ හැක්කේ Admin සහ HandMade Officer ට පමණි
// Body එකට අලුතින් 'sampleType' (අනිවාර්යයි) සහ 'officerName' (Factory නම්) යැවිය යුතුය.
loftLeafrouter.post('/', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), createLoftLeafCount);

// PUT: දත්ත Update කළ හැක්කේ ද Admin සහ HandMade Officer ට පමණි
// Body එකට අලුතින් 'sampleType' සහ 'officerName' update කිරීමට යැවිය හැක.
loftLeafrouter.put('/:id', verifyToken, authorizeRoles('Admin', 'HandMade Officer'), updateLoftLeafCount);

// DELETE: දත්ත Delete කිරීමේ බලය Admin ට පමණක් ලබා දීම වඩාත් ආරක්ෂිතයි
loftLeafrouter.delete('/:id', verifyToken, authorizeRoles('Admin'), deleteLoftLeafCount);

export default loftLeafrouter;