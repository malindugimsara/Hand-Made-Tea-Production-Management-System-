import express from 'express';
import { deleteFactoryLog, getFactoryLogsByMonth, saveDailyFactoryLog } from '../controller/factoryController.js';

const factoryrouter = express.Router();

factoryrouter.get('/', getFactoryLogsByMonth);
factoryrouter.post('/', saveDailyFactoryLog);
factoryrouter.delete('/:id', deleteFactoryLog); 
export default factoryrouter;