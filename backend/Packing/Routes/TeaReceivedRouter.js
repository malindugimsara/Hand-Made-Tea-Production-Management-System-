import express from 'express';
import {
    createTeaReceivedRecord,
    getTeaReceivedRecords,
    deleteTeaReceivedRecord,
    updateTeaReceivedRecord
} from '../controllers/TeaReceivedController.js'; // Ensure this matches your new controller file name

const teaReceivedRouter = express.Router();

// Base route: /api/tea-received
teaReceivedRouter.route('/')
    .post(createTeaReceivedRecord)
    .get(getTeaReceivedRecords);

// ID route: /api/tea-received/:id
teaReceivedRouter.route('/:id')
    .delete(deleteTeaReceivedRecord)
    .put(updateTeaReceivedRecord); 

export default teaReceivedRouter;