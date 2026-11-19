import express from 'express';
import {
  saveRollingRoomSheet,
  updateRollingRoomSheetById,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const rollingRoomSheetRouter = express.Router();

// Base endpoint: /api/rolling-room-sheet
rollingRoomSheetRouter
  .route('/')
  .get(getRollingRoomSheets)
  .post(verifyToken, authorizeRoles('admin', 'manager', 'user', 'Admin', 'User'), saveRollingRoomSheet);

rollingRoomSheetRouter
  .route('/:id')
  .get(getRollingRoomSheetById)
  .put(verifyToken, authorizeRoles('admin', 'manager', 'user', 'Admin', 'User'), updateRollingRoomSheetById)
  .delete(verifyToken, authorizeRoles('admin', 'manager', 'Admin'), deleteRollingRoomSheet);

export default rollingRoomSheetRouter;