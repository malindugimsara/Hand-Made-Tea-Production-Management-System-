import express from 'express';
import { createLabour, deleteLabour, getAllLabour, updateLabour } from '../controller/labourController.js';


const labourRouter = express.Router();

labourRouter.post('/', createLabour);
labourRouter.get('/', getAllLabour);
labourRouter.put('/:id', updateLabour);
labourRouter.delete('/:id', deleteLabour);

export default labourRouter;