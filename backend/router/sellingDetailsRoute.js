import express from 'express';
import { createSellingDetail , getSellingDetailsByMonth} from '../controller/sellingDetailsController.js';

const sellingDetailsRouter = express.Router();

// Using '/' here so you can mount it cleanly in your main server file
sellingDetailsRouter.post('/', createSellingDetail);
sellingDetailsRouter.get('/', getSellingDetailsByMonth);


export default sellingDetailsRouter;