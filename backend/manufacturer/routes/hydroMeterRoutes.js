import express from 'express';
import { saveHydroMeterData, getHydroMeterDataByDate } from '../controllers/hydroMeterController.js';

// ඔබගේ project එකේ Authentication Middleware එක import කරගන්න (ඇත්නම්)
// import { protect } from '../middleware/authMiddleware.js'; 

const hydroMeterRouter = express.Router();

// POST request to Save/Update
hydroMeterRouter.post('/save', /* protect, */ saveHydroMeterData);

// GET request to Fetch data by date
hydroMeterRouter.get('/get', /* protect, */ getHydroMeterDataByDate);

export default hydroMeterRouter;