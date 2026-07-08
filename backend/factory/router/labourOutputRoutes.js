import express from 'express';
import {getLabourOutputs, saveLabourOutput,deleteLabourLogsByDate, updateLabourOutputByDate}  from '../controller/labourOutputController.js';

const labourOutputRouter = express.Router();

// You can add get/delete here later just like your factory logs!
labourOutputRouter.delete('/date/:date', deleteLabourLogsByDate); // Put this FIRST

labourOutputRouter.post('/', saveLabourOutput);
labourOutputRouter.get('/', getLabourOutputs);
labourOutputRouter.put('/date/:date', updateLabourOutputByDate);
export default labourOutputRouter;