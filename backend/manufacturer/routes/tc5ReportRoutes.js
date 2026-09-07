import express from 'express';
import { saveTC5Report, getTC5ReportByMonth } from '../controllers/tc5ReportController.js';

const tc5router = express.Router();

tc5router.post('/', saveTC5Report);
tc5router.get('/', getTC5ReportByMonth);

export default tc5router;