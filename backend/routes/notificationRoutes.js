import express from 'express';
import { subscribe, unsubscribe } from '../controllers/notificationController.js';

const notificationRoutes = express.Router();

// POST /api/notifications/subscribe - Register or update web push subscription
notificationRoutes.post('/subscribe', subscribe);

// POST /api/notifications/unsubscribe - Remove web push subscription
notificationRoutes.post('/unsubscribe', unsubscribe);

export default notificationRoutes;
