import express from 'express';
import {
  saveRollingRoomSheet,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const rollingRouter = express.Router();

// Base URL: /api/rolling-room-sheet

// POST request to Save
rollingRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveRollingRoomSheet);

// GET request to Fetch all sheets 
rollingRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRollingRoomSheets);

// GET request to Fetch sheet by ID 
rollingRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRollingRoomSheetById);

// DELETE request to delete sheet 
rollingRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteRollingRoomSheet);

export default rollingRouter;