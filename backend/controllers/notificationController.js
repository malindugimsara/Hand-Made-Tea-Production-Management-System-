import webpush from 'web-push';
import cron from 'node-cron';
import Subscription from '../models/Subscription.js';
import { Production } from '../models/Production.js';

// Initialize Web Push VAPID credentials
const initWebPush = () => {
  const { EMAIL, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY } = process.env;
  if (EMAIL && PUBLIC_VAPID_KEY && PRIVATE_VAPID_KEY) {
    try {
      webpush.setVapidDetails(EMAIL, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
    } catch (err) {
      console.error('[WebPush] VAPID configuration error:', err.message);
    }
  } else {
    console.warn('[WebPush] VAPID keys missing in environment. Push notifications disabled.');
  }
};

initWebPush();

/**
 * Send push notification to a single subscriber.
 * Automatically removes stale/expired subscriptions (HTTP 404 / 410).
 */
export const sendPushNotification = async (subscription, payload) => {
  try {
    const stringPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await webpush.sendNotification(subscription, stringPayload);
    return true;
  } catch (error) {
    // 404 (Not Found) or 410 (Gone) indicates client unsubscribed or push token expired
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[WebPush] Removing expired subscription: ${subscription.endpoint}`);
      await Subscription.deleteOne({ endpoint: subscription.endpoint }).catch(() => {});
    } else {
      console.error(`[WebPush] Failed to deliver push notification (Status: ${error.statusCode || 'N/A'}):`, error.message);
    }
    return false;
  }
};

/**
 * Send push notifications to subscribers matching a query filter (e.g. role or section).
 */
export const sendPushToRole = async (filter, payload) => {
  try {
    const subscriptions = await Subscription.find(filter);
    if (!subscriptions.length) return 0;

    const deliveryPromises = subscriptions.map((sub) => sendPushNotification(sub, payload));
    const results = await Promise.all(deliveryPromises);
    return results.filter(Boolean).length;
  } catch (err) {
    console.error('[WebPush] Error delivering role-targeted notifications:', err.message);
    return 0;
  }
};

/**
 * POST /api/notifications/subscribe
 * Register or update a user's web push subscription.
 */
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys, role, section } = req.body;

    // Validate required PushSubscription fields
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ 
        error: 'Invalid subscription payload. Endpoint and authentication keys are required.' 
      });
    }

    const subscriptionData = {
      endpoint,
      keys,
      role: role || req.user?.role || 'Unknown',
      section: section || 'Packing',
      userId: req.user?.id || null
    };

    const savedSubscription = await Subscription.findOneAndUpdate(
      { endpoint },
      subscriptionData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ 
      success: true, 
      message: 'Push subscription saved successfully.',
      subscriptionId: savedSubscription._id
    });

    // Send instant welcome confirmation push
    const welcomePayload = {
      title: 'Notifications Enabled ✅',
      body: 'You will now receive alerts for new transfers and daily tasks.',
      data: { url: '/dashboard' }
    };

    sendPushNotification(savedSubscription, welcomePayload).catch(() => {});

  } catch (error) {
    console.error('[NotificationController] Error saving subscription:', error);
    res.status(500).json({ error: 'Failed to save push subscription.' });
  }
};

/**
 * POST /api/notifications/unsubscribe
 * Delete a push subscription.
 */
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required to unsubscribe.' });
    }

    await Subscription.deleteOne({ endpoint });
    res.status(200).json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error('[NotificationController] Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
};

/**
 * Check for pending dryer tasks today and send notification to subscribers.
 */
export const checkAndSendDailyDryerNotifications = async () => {
  try {
    console.log('[Notification Cron] Checking for pending dryer tasks for today...');
    
    // Today's date prefix (YYYY-MM-DD)
    const todayDate = new Date().toISOString().split('T')[0];

    const pendingTasks = await Production.find({
      expectedDryerDate: { $regex: `^${todayDate}` }
    });

    if (pendingTasks.length > 0) {
      console.log(`[Notification Cron] Found ${pendingTasks.length} pending dryer task(s). Sending notifications...`);

      const subscriptions = await Subscription.find({});
      if (subscriptions.length === 0) {
        console.log('[Notification Cron] No active subscriptions found.');
        return;
      }

      const payload = {
        title: 'Dryer Tasks Pending Today! 🍂',
        body: `You have ${pendingTasks.length} handmade/production task(s) scheduled to be dried today. Please check the system.`,
        data: { url: '/view-green-leaf' }
      };

      const promises = subscriptions.map((sub) => sendPushNotification(sub, payload));
      await Promise.all(promises);
      console.log(`[Notification Cron] Daily dryer notifications dispatched to ${subscriptions.length} subscriber(s).`);
    } else {
      console.log('[Notification Cron] No pending dryer tasks for today.');
    }
  } catch (error) {
    console.error('[Notification Cron] Daily notification check failed:', error.message);
  }
};

/**
 * Register notification cron jobs.
 * Runs at 08:30 AM every day.
 */
export const startNotificationCron = () => {
  cron.schedule('30 8 * * *', async () => {
    await checkAndSendDailyDryerNotifications();
  });
  console.log('[Notification Module] Daily dryer notification cron scheduled (08:30 AM daily).');
};

export default {
  subscribe,
  unsubscribe,
  sendPushNotification,
  sendPushToRole,
  checkAndSendDailyDryerNotifications,
  startNotificationCron
};
