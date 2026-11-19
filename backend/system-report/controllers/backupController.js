import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import mongoose from 'mongoose';

const gzipAsync = promisify(zlib.gzip);

// Determine Backup Directory (supports .env override, local existing path, or ./backups fallback)
const getBackupDirectory = () => {
  if (process.env.BACKUP_DIR) {
    return path.resolve(process.env.BACKUP_DIR);
  }
  if (fs.existsSync('D:\\Athukorala\\Backup')) {
    return path.resolve('D:\\Athukorala\\Backup');
  }
  return path.resolve('backups');
};

const BACKUP_DIR = getBackupDirectory();

// Ensure local backup directory exists
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

/**
 * Perform pure Node.js native MongoDB backup.
 * Reads all collections directly from active MongoDB connection,
 * serializes to JSON, and compresses with GZIP into .json.gz file.
 * OS-independent: works on Windows, Linux, Mac, Docker, etc.
 */
export const performNativeBackup = async (type = 'manual') => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected. Cannot perform backup.');
  }

  // 1. Fetch user collections (exclude system collections)
  const allCols = await mongoose.connection.db.listCollections().toArray();
  const userCollections = allCols.filter((col) => !col.name.startsWith('system.'));

  const backupData = {
    metadata: {
      version: '1.0',
      type, // 'manual' or 'auto'
      createdAt: new Date().toISOString(),
      database: mongoose.connection.name,
      totalCollections: userCollections.length,
      totalDocuments: 0,
    },
    collections: {},
  };

  let totalDocs = 0;

  // 2. Fetch documents for each collection
  for (const col of userCollections) {
    const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
    backupData.collections[col.name] = docs;
    totalDocs += docs.length;
  }

  backupData.metadata.totalDocuments = totalDocs;

  // 3. Serialize and Compress via Gzip
  const rawJson = JSON.stringify(backupData);
  const compressedBuffer = await gzipAsync(Buffer.from(rawJson, 'utf-8'));

  // 4. Construct safe, structured filename (matches frontend auto/manual detection)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `backup_${type}_${timestamp}.json.gz`;
  const filePath = path.join(BACKUP_DIR, filename);

  // 5. Write to disk
  await fs.promises.writeFile(filePath, compressedBuffer);

  const sizeBytes = compressedBuffer.length;
  const sizeFormatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

  return {
    filename,
    filePath,
    sizeBytes,
    sizeFormatted,
    totalCollections: userCollections.length,
    totalDocuments: totalDocs,
  };
};

// 1. GET: Fetch list of all local backup files and folders
export const getBackupList = (req, res) => {
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
};

// 2. POST: Trigger Manual Backup
export const triggerBackup = async (req, res) => {
  if (isBackupRunning) {
    return res.status(409).json({
      success: false,
      message: 'A backup process is already running. Please wait.',
    });
  }

  isBackupRunning = true;

  try {
    const result = await performNativeBackup('manual');

    res.json({
      success: true,
      message: 'Native backup completed and saved to local folder.',
      filename: result.filename,
      storagePath: BACKUP_DIR,
      sizeFormatted: result.sizeFormatted,
      totalDocuments: result.totalDocuments,
      totalCollections: result.totalCollections,
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Manual backup execution failed.',
      error: error.message,
    });
  } finally {
    isBackupRunning = false;
  }
};

// 3. GET: Download backup file directly from local storage
export const downloadBackup = (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, safeFilename);
  } else {
    res.status(404).json({ success: false, message: 'Local backup file not found' });
  }
};

// 4. DELETE: Delete backup archive
export const deleteBackup = async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return res.json({ success: true, message: 'Backup file deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'File not found' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
