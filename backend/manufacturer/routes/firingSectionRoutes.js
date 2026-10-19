import express from 'express';
import {
  saveFiringSection,
  getFiringSections,
  getFiringSectionById,
  deleteFiringSection,
  updateFiringSectionRecord
} from '../controllers/firingSectionController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const FiringRouter = express.Router();

// 💡 Secure endpoints using verifyToken and authorizeRoles
FiringRouter.route('/')
  .post(verifyToken, authorizeRoles('Admin', 'User'), saveFiringSection)
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getFiringSections);

FiringRouter.route('/:id')
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getFiringSectionById)
  .delete(verifyToken, authorizeRoles('Admin', 'User'), deleteFiringSection)
  .put(verifyToken, authorizeRoles('Admin', 'User'), updateFiringSectionRecord);

export default FiringRouter;