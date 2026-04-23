import express from 'express';
import {
    createTeaCenterIssue,
    getTeaCenterIssues
} from '../controllers/TeaCenterIssueController.js';

const teaCenterIssueRouter = express.Router();

teaCenterIssueRouter.route('/')
    .post(createTeaCenterIssue)
    .get(getTeaCenterIssues);

export default teaCenterIssueRouter;