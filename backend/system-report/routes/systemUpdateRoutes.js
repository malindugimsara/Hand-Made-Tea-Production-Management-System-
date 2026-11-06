import express from 'express'; 
import {
  createSystemUpdate,
  getSystemUpdates,
  updateSystemUpdate,
  deleteSystemUpdate
} from '../controllers/systemUpdateController.js';
import { verifyToken, authorizeRoles } from '../../middleware/auth.js';

const systemReportRouter = express.Router();

// 💡 Restrict all /api/system-updates endpoints to Developer role only
systemReportRouter.use(verifyToken, authorizeRoles('Developer'));

// Route: /api/system-updates
systemReportRouter.route('/')
  .post(createSystemUpdate)
  .get(getSystemUpdates);

systemReportRouter.route('/:id')
  .put(updateSystemUpdate)
  .delete(deleteSystemUpdate);

export default systemReportRouter;