import express from 'express';
import {
  createWitherLeaf,
  getWitherLeaves,
  getWitherLeafById,
  updateWitherLeaf,
  deleteWitherLeaf
} from '../controllers/witherLeafController.js';

// 💡 Authentication Middlewares import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const wizerLeafRouter = express.Router();

// Route definitions
wizerLeafRouter.route('/')
  // POST request to Create (Admin සහ User සඳහා පමණි)
  .post(verifyToken, authorizeRoles('Admin', 'User'), createWitherLeaf)
  // GET request to Fetch all (Viewer ඇතුළු සියලුම දෙනාට)
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getWitherLeaves);

wizerLeafRouter.route('/:id')
  // GET request to Fetch by ID (Viewer ඇතුළු සියලුම දෙනාට)
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getWitherLeafById)
  // PUT request to Update (Admin සහ User සඳහා පමණි)
  .put(verifyToken, authorizeRoles('Admin', 'User'), updateWitherLeaf)
  // DELETE request to Delete (Admin සහ User සඳහා පමණි)
  .delete(verifyToken, authorizeRoles('Admin', 'User'), deleteWitherLeaf);

export default wizerLeafRouter;