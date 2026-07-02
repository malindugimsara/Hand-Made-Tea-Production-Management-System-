import express from 'express';
import {getLabourOutputs, saveLabourOutput,deleteLabourLogsByDate}  from '../controller/labourOutputController.js';

const labourRouter = express.Router();

// You can add get/delete here later just like your factory logs!
labourRouter.delete('/date/:date', deleteLabourLogsByDate); // Put this FIRST

labourRouter.post('/', saveLabourOutput);
labourRouter.get('/', getLabourOutputs);

export default labourRouter;