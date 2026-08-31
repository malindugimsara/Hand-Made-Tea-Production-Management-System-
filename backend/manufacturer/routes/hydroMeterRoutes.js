import express from 'express';
import { saveHydroMeterData, getHydroMeterDataByDate, getAllHydroMeters, deleteHydroMeter } from '../controllers/hydroMeterController.js';

// ඔබගේ project එකේ Authentication Middleware එක import කරගන්න (ඇත්නම්)
// import { protect } from '../middleware/authMiddleware.js'; 

const hydroMeterRouter = express.Router();

// POST request to Save/Update
hydroMeterRouter.post('/save', /* protect, */ saveHydroMeterData);

// GET request to Fetch data by date
hydroMeterRouter.get('/get', /* protect, */ getHydroMeterDataByDate);

hydroMeterRouter.get('/get-all', getAllHydroMeters);
hydroMeterRouter.delete('/delete', deleteHydroMeter);

export default hydroMeterRouter;