import express from 'express';
import { autoGenerateMissing, deleteAuditLog, getAuditLogs, saveAuditLog, updateAuditLog } from '../controllers/auditController.js';


const auditRoutes = express.Router();

auditRoutes.get('/auto-generate', autoGenerateMissing);
auditRoutes.post('/logs', saveAuditLog);
auditRoutes.get('/logs', getAuditLogs);
auditRoutes.put('/logs/:id', updateAuditLog);
auditRoutes.delete('/logs/:id', deleteAuditLog);

export default auditRoutes;


