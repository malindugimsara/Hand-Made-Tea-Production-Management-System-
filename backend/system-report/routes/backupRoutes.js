import express from 'express';
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';
import {
  getBackupList,
  triggerBackup,
  downloadBackup,
  deleteBackup
} from '../controllers/backupController.js';

const backupRouter = express.Router();

// Restrict all backup routes to authenticated users with Developer or Admin roles
backupRouter.use(verifyToken, authorizeRoles('Developer', 'Admin'));

// 1. GET: Fetch list of all local backup files and folders
backupRouter.get('/list', getBackupList);

// 2. POST: Trigger Manual Backup
backupRouter.post('/trigger', triggerBackup);

// 3. GET: Download backup file directly from local storage
backupRouter.get('/download/:filename', downloadBackup);

// 4. DELETE: Delete backup archive
backupRouter.delete('/:filename', deleteBackup);

export default backupRouter;
