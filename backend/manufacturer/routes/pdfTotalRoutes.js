import express from 'express';
import { savePdfTotals, getPdfTotalsByMonth } from '../controllers/pdfTotalController.js';

// 💡 Authentication Middlewares import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const pdfTotalRouter = express.Router();

// POST request to Save (Admin සහ User සඳහා පමණි)
pdfTotalRouter.post('/save', verifyToken, authorizeRoles('Admin', 'User'), savePdfTotals);

// GET request to Fetch data by month (Viewer ඇතුළු සියලුම දෙනාට)
pdfTotalRouter.get('/get', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getPdfTotalsByMonth);

export default pdfTotalRouter;