import express from 'express';
import {
  saveRollingRoomSheet,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';

// 💡 Authentication Middlewares import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const rollingRouter = express.Router();

// Base URL: /api/rolling-room-sheet

// POST request to Save (Admin සහ User සඳහා පමණි)
rollingRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveRollingRoomSheet);

// GET request to Fetch all sheets (Viewer ඇතුළු සියලුම දෙනාට)
rollingRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRollingRoomSheets);

// GET request to Fetch sheet by ID (Viewer ඇතුළු සියලුම දෙනාට)
rollingRouter.get('/:id', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getRollingRoomSheetById);

// DELETE request to delete sheet (Admin සහ User සඳහා පමණි)
rollingRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteRollingRoomSheet);

export default rollingRouter;