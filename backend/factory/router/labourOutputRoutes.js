import express from 'express';
import {getLabourOutputs, saveLabourOutput}  from '../controller/labourOutputController.js';

const labourRouter = express.Router();

// You can add get/delete here later just like your factory logs!
labourRouter.post('/', saveLabourOutput);
labourRouter.get('/', getLabourOutputs);

export default labourRouter;