import express from 'express';
import {
  saveRollingRoomSheet,
  updateRollingRoomSheetById,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const router = express.Router();

// Base endpoint: /api/rolling-room-sheet
router
  .route('/')
  .get(getRollingRoomSheets)
  .post(verifyToken, authorizeRoles('admin', 'manager', 'user', 'Admin', 'User'), saveRollingRoomSheet);

router
  .route('/:id')
  .get(getRollingRoomSheetById)
  .put(verifyToken, authorizeRoles('admin', 'manager', 'user', 'Admin', 'User'), updateRollingRoomSheetById)
  .delete(verifyToken, authorizeRoles('admin', 'manager', 'Admin'), deleteRollingRoomSheet);

export default router;