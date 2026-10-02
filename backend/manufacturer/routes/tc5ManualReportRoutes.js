import express from "express";
import { getTC5ManualReportByMonth, saveTC5ManualReport } from "../controllers/tc5ManualReportController.js";
import { authorizeRoles, verifyToken } from '../../middleware/auth.js';

const tc5ManualReportRouter = express.Router();

tc5ManualReportRouter.route("/")
  .get(verifyToken, getTC5ManualReportByMonth)
  .post(verifyToken, saveTC5ManualReport);

export default tc5ManualReportRouter;