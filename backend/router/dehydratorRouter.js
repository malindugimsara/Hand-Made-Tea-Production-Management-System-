import express from 'express';
import { createDehydrator, deleteDehydrator, getAllDehydrator, updateDehydrator } from '../controller/dehydratorController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const dehydratorRouter = express.Router();

dehydratorRouter.post('/', verifyToken, authorizeRoles('Admin', 'Officer'), createDehydrator);
dehydratorRouter.get('/', verifyToken, authorizeRoles('Admin', 'Officer', 'Viewer'), getAllDehydrator);
dehydratorRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), updateDehydrator);
dehydratorRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'Officer'), deleteDehydrator);


export default dehydratorRouter;