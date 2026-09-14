import express from 'express';
import {
  createWitherLeaf,
  getWitherLeaves,
  getWitherLeafById,
  updateWitherLeaf,
  deleteWitherLeaf
} from '../controllers/witherLeafController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const wizerLeafRouter = express.Router();

// Route definitions
wizerLeafRouter.route('/')
  // POST request to Create 
  .post(verifyToken, authorizeRoles('Admin', 'User'), createWitherLeaf)
  // GET request to Fetch all 
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getWitherLeaves);

wizerLeafRouter.route('/:id')
  // GET request to Fetch by ID 
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getWitherLeafById)
  // PUT request to Update 
  .put(verifyToken, authorizeRoles('Admin', 'User'), updateWitherLeaf)
  // DELETE request to Delete 
  .delete(verifyToken, authorizeRoles('Admin', 'User'), deleteWitherLeaf);

export default wizerLeafRouter;