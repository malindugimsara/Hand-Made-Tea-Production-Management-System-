import express from 'express';
import { 
  saveHydroMeterData, 
  getHydroMeterDataByDate, 
  getAllHydroMeters, 
  deleteHydroMeter 
} from '../controllers/hydroMeterController.js';

// 💡 Authentication Middlewares import කිරීම
import { authorizeRoles, verifyToken } from '../../middleware/auth.js'; 

const hydroMeterRouter = express.Router();

// POST request to Save/Update (Admin සහ User සඳහා පමණි)
hydroMeterRouter.post('/save', verifyToken, authorizeRoles('Admin', 'User'), saveHydroMeterData);

// GET request to Fetch data by date (Viewer ඇතුළු සියලුම දෙනාට)
hydroMeterRouter.get('/get', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getHydroMeterDataByDate);

// GET request to Fetch all data (Viewer ඇතුළු සියලුම දෙනාට)
hydroMeterRouter.get('/get-all', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getAllHydroMeters);

// DELETE request to delete data (Admin සහ User සඳහා පමණි)
hydroMeterRouter.delete('/delete', verifyToken, authorizeRoles('Admin', 'User'), deleteHydroMeter);

export default hydroMeterRouter;