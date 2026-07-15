import express from 'express';
import { saveDailyLedger, getLedgerData, deleteLedgerRow } from '../controller/factoryPackController.js';

const factoryPackRouter = express.Router();

// Root route: GET fetches the list, POST creates or edits a day's record
factoryPackRouter.route('/')
  .post(saveDailyLedger)
  .get(getLedgerData);

// ID route: DELETE removes a specific record from the database
factoryPackRouter.route('/:id')
  .delete(deleteLedgerRow);

export default factoryPackRouter;