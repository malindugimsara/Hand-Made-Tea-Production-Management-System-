import express from 'express';
import { savePdfTotals, getPdfTotalsByMonth } from '../controllers/pdfTotalController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const pdfTotalRouter = express.Router();

// POST request to Save 
pdfTotalRouter.post('/save', verifyToken, authorizeRoles('Admin', 'User'), savePdfTotals);

// GET request to Fetch data by month 
pdfTotalRouter.get('/get', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getPdfTotalsByMonth);

export default pdfTotalRouter;