import express from 'express';
import { createDehydrator, deleteDehydrator, getAllDehydrator, updateDehydrator } from '../controller/dehydratorController.js';

import { verifyToken, authorizeRoles } from '../middleware/auth.js'; 

const dehydratorRouter = express.Router();

dehydratorRouter.post('/', verifyToken, authorizeRoles('Admin', 'User'), createDehydrator);
dehydratorRouter.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllDehydrator);
dehydratorRouter.put('/:id', verifyToken, authorizeRoles('Admin', 'User'), updateDehydrator);
dehydratorRouter.delete('/:id', verifyToken, authorizeRoles('Admin', 'User'), deleteDehydrator);


export default dehydratorRouter;