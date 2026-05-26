import express from 'express';
import {
    createRawMaterialIn,
    getAllRawMaterialInRecords,
    getRawMaterialInById,
    updateRawMaterialInRecord, // අලුතින් එක් කරන ලදි
    deleteRawMaterialInRecord,
    getRawMaterialStock
} from '../controllers/rawMaterialInController.js'; 

const rawMaterialInRouter = express.Router();

// GET routes
rawMaterialInRouter.get('/', getAllRawMaterialInRecords); 
rawMaterialInRouter.get('/stock', getRawMaterialStock);          
rawMaterialInRouter.get('/:id', getRawMaterialInById);               

// POST route (Frontend එකෙන් යවන්නේ /api/raw-materials-in/ නම් මෙහි '/' විය යුතුය)
// ඔබගේ frontend code එකේ create කරන තැන fetch(`${BACKEND_URL}/api/raw-materials-in`) ලෙස තිබේ නම්:
rawMaterialInRouter.post('/', createRawMaterialIn);        

// PUT route (Update කිරීම සඳහා අනිවාර්යයි)
rawMaterialInRouter.put('/:id', updateRawMaterialInRecord);

// DELETE route (Frontend එකෙන් යවන්නේ /api/raw-materials-in/${id} නම් මෙහි '/:id' විය යුතුය)
rawMaterialInRouter.delete('/:id', deleteRawMaterialInRecord); 


export default rawMaterialInRouter;