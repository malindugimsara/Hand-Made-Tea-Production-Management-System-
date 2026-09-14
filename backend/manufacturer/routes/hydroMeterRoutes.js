import express from 'express';
import { 
  saveHydroMeterData, 
  getHydroMeterDataByDate, 
  getAllHydroMeters, 
  deleteHydroMeter 
} from '../controllers/hydroMeterController.js';

import { authorizeRoles, verifyToken } from '../../middleware/auth.js'; 

const hydroMeterRouter = express.Router();

// POST request to Save or Update Hydro Meter Data
hydroMeterRouter.post('/save', verifyToken, authorizeRoles('Admin', 'User'), saveHydroMeterData);

// GET request to Fetch data by date 
hydroMeterRouter.get('/get', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getHydroMeterDataByDate);

// GET request to Fetch all data 
hydroMeterRouter.get('/get-all', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllHydroMeters);

// DELETE request to delete data 
hydroMeterRouter.delete('/delete', verifyToken, authorizeRoles('Admin', 'User'), deleteHydroMeter);

export default hydroMeterRouter;