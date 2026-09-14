import express from 'express';
import { saveTC5Report, getTC5ReportByMonth } from '../controllers/tc5ReportController.js';
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const tc5router = express.Router();

// POST request to Save 
tc5router.post('/', verifyToken, authorizeRoles('Admin', 'User'), saveTC5Report);

// GET request to Fetch data by month 
tc5router.get('/', verifyToken, authorizeRoles('Admin', 'User', 'Viewer'), getTC5ReportByMonth);

export default tc5router;