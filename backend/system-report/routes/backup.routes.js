import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Target directory on your local drive
const BACKUP_DIR = path.resolve('D:\\Athukorala\\Backup');

// Path to your batch file
const SCRIPT_PATH = path.resolve('C:\\Users\\User\\Documents\\mongo_backup.bat');

// Ensure local directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let isBackupRunning = false;

// Helper: Get size whether entry is a file or a folder
function getItemSize(itemPath) {
  try {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) return stats.size;

    if (stats.isDirectory()) {
      let total = 0;
      const entries = fs.readdirSync(itemPath, { withFileTypes: true });
      for (const entry of entries) {
        total += getItemSize(path.join(itemPath, entry.name));
      }
      return total;
    }
  } catch (err) {
    return 0;
  }
  return 0;
}

// 1. GET: Fetch list of all local backup files and folders
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);

    const backups = files
      .filter((file) => file.endsWith('.gz') || file.endsWith('.zip') || file.startsWith('_'))
      .map((fileName) => {
        const fullPath = path.join(BACKUP_DIR, fileName);
        const stats = fs.statSync(fullPath);
        const sizeBytes = getItemSize(fullPath);

        return {
          filename: fileName,
          createdAt: stats.birthtime || stats.mtime,
          sizeBytes,
          sizeFormatted: (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
          fullPath,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      isRunning: isBackupRunning,
      storagePath: BACKUP_DIR,
      backups,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST: Trigger Manual Backup
router.post('/trigger', (req, res) => {
  if (isBackupRunning) {
    return res.status(409).json({
      success: false,
      message: 'A backup process is already running. Please wait.',
    });
  }

  isBackupRunning = true;

  // Execute the local batch file
  exec(`"${SCRIPT_PATH}"`, { windowsHide: true }, (error, stdout, stderr) => {
    isBackupRunning = false;

    if (error) {
      console.error('Backup failed:', stderr || error.message);
      return res.status(500).json({
        success: false,
        message: 'Manual backup execution failed.',
        error: stderr || error.message,
      });
    }

    res.json({
      success: true,
      message: 'Backup completed and saved to local folder.',
      storagePath: BACKUP_DIR,
    });
  });
});

// 3. GET: Download backup file directly from local storage
router.get('/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ success: false, message: 'Local backup file not found' });
  }
});

export default router;