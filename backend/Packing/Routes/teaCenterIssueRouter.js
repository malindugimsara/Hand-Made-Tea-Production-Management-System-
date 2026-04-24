import express from 'express';
import {
    createTeaCenterIssue,
    deleteTeaCenterIssue,
    getTeaCenterIssues,
    updateTeaCenterIssue
} from '../controllers/TeaCenterIssueController.js';

const teaCenterIssueRouter = express.Router();

teaCenterIssueRouter.route('/')
    .post(createTeaCenterIssue)
    .get(getTeaCenterIssues)

teaCenterIssueRouter.route('/:id')
.put(updateTeaCenterIssue);

teaCenterIssueRouter.route('/:id')
.delete(deleteTeaCenterIssue);

export default teaCenterIssueRouter;