import express from 'express'; 
import {
  createSystemUpdate,
  getSystemUpdates,
  updateSystemUpdate,
  deleteSystemUpdate
} from '../controllers/systemUpdateController.js';

const systemReportRouter = express.Router();

// Route: /api/system-updates
systemReportRouter.route('/')
  .post(createSystemUpdate)
  .get(getSystemUpdates);

systemReportRouter.route('/:id')
  .put(updateSystemUpdate)
  .delete(deleteSystemUpdate);

export default systemReportRouter;