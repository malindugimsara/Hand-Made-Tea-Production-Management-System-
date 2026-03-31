import express from 'express';
import { createGreenLeaf, deleteGreenLeaf, getAllGreenLeaf, updateGreenLeaf } from '../controller/greenLeafController.js';


const greenLeafRouter = express.Router();

greenLeafRouter.post('/', createGreenLeaf);
greenLeafRouter.get('/', getAllGreenLeaf);
greenLeafRouter.put('/:id', updateGreenLeaf);
greenLeafRouter.delete('/:id', deleteGreenLeaf);


export default greenLeafRouter;