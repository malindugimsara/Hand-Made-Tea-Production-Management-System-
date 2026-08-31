import express from 'express';
import {
  saveFiringSection,
  getFiringSections,
  getFiringSectionById,
  deleteFiringSection
} from '../controllers/firingSectionController.js';


const FiringRouter = express.Router();

// Optional: Apply protect middleware to secure all endpoint
FiringRouter.route('/')
  .post(saveFiringSection)
  .get(getFiringSections);

FiringRouter.route('/:id')
  .get(getFiringSectionById)
  .delete(deleteFiringSection);

export default FiringRouter;