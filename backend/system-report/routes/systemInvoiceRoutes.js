import express from 'express';
import { createInvoice, getInvoices, updateInvoice, deleteInvoice } from '../controllers/systemInvoiceController.js';

const systemInvoiceRoute = express.Router();

systemInvoiceRoute.post('/', createInvoice);
systemInvoiceRoute.get('/', getInvoices);
systemInvoiceRoute.put('/:id', updateInvoice);
systemInvoiceRoute.delete('/:id', deleteInvoice);

export default systemInvoiceRoute;