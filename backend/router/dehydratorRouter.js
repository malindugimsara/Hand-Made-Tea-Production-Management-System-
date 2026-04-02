import express from 'express';
import { createDehydrator, deleteDehydrator, getAllDehydrator, updateDehydrator } from '../controller/dehydratorController.js';


const dehydratorRouter = express.Router();

dehydratorRouter.post('/', createDehydrator);
dehydratorRouter.get('/', getAllDehydrator);
dehydratorRouter.put('/:id', updateDehydrator);
dehydratorRouter.delete('/:id', deleteDehydrator);


export default dehydratorRouter;