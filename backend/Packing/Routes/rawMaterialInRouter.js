import express from 'express';
import {
    createRawMaterialIn,
    getAllRawMaterialInRecords,
    getRawMaterialInById,
    deleteRawMaterialInRecord,
    getRawMaterialStock
} from '../controllers/rawMaterialInController.js'; 


const rawMaterialInRouter = express.Router();

rawMaterialInRouter.post('/create', createRawMaterialIn);        
rawMaterialInRouter.get('/', getAllRawMaterialInRecords); 
rawMaterialInRouter.get('/stock', getRawMaterialStock);          
rawMaterialInRouter.get('/:id', getRawMaterialInById);               
rawMaterialInRouter.delete('/delete/:id', deleteRawMaterialInRecord); 


export default rawMaterialInRouter;

