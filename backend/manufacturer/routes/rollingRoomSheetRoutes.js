import express from 'express';
import {
  saveRollingRoomSheet,
  getRollingRoomSheets,
  getRollingRoomSheetById,
  deleteRollingRoomSheet
} from '../controllers/rollingRoomSheetController.js';

const rollingRouter = express.Router();

// Base URL: /api/rolling-room-sheet
rollingRouter.post('/', saveRollingRoomSheet);
rollingRouter.get('/', getRollingRoomSheets);
rollingRouter.get('/:id', getRollingRoomSheetById);
rollingRouter.delete('/:id', deleteRollingRoomSheet);

export default rollingRouter;