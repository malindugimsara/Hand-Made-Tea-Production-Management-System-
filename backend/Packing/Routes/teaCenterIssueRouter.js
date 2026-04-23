import express from 'express';
import {
    createTeaCenterIssue,
    getTeaCenterIssues,
    updateTeaCenterIssue
} from '../controllers/TeaCenterIssueController.js';

const teaCenterIssueRouter = express.Router();

teaCenterIssueRouter.route('/')
    .post(createTeaCenterIssue)
    .get(getTeaCenterIssues)

teaCenterIssueRouter.route('/:id')
.put(updateTeaCenterIssue);

export default teaCenterIssueRouter;