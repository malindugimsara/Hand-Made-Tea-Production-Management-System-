import express from 'express';
import {
  saveFiringSection,
  getFiringSections,
  getFiringSectionById,
  deleteFiringSection
} from '../controllers/firingSectionController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js'; // 💡 Middleware ඉම්පෝට් කිරීම

const FiringRouter = express.Router();

// 💡 Secure endpoints using verifyToken and authorizeRoles
FiringRouter.route('/')
  .post(verifyToken, authorizeRoles('Admin', 'User'), saveFiringSection)
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getFiringSections);

FiringRouter.route('/:id')
  .get(verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getFiringSectionById)
  .delete(verifyToken, authorizeRoles('Admin', 'User'), deleteFiringSection);

export default FiringRouter;