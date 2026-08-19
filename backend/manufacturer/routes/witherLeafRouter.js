import express from 'express';
import {
  createWitherLeaf,
  getWitherLeaves,
  getWitherLeafById,
  updateWitherLeaf,
  deleteWitherLeaf
} from '../controllers/witherLeafController.js';

const wizerLeafRouter = express.Router();

// Route definitions
wizerLeafRouter.route('/')
  .post(createWitherLeaf)
  .get(getWitherLeaves);

wizerLeafRouter.route('/:id')
  .get(getWitherLeafById)
  .put(updateWitherLeaf)
  .delete(deleteWitherLeaf);

export default wizerLeafRouter;