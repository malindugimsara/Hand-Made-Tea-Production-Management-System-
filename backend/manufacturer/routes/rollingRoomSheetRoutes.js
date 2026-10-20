import express from 'express';
import {
  saveRollingRoomSheet,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';
// Replace with your actual auth middleware path
import {authorizeRoles,verifyToken } from '../../middleware/auth.js  ';

const router = express.Router();

// Base endpoint: /api/rolling-room-sheet
router
  .route('/')
  .get( getRollingRoomSheets)
  .post( saveRollingRoomSheet);

router  
  .route('/:id')
  .get( getRollingRoomSheetById)
  .delete( verifyToken, authorizeRoles('admin', 'manager'), deleteRollingRoomSheet);

export default router;