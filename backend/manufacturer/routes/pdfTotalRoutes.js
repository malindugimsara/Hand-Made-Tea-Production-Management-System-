import express from 'express';
import { savePdfTotals, getPdfTotalsByMonth } from '../controllers/pdfTotalController.js';

const pdfTotalRouter = express.Router();

pdfTotalRouter.post('/save', savePdfTotals);
pdfTotalRouter.get('/get', getPdfTotalsByMonth);

export default pdfTotalRouter;