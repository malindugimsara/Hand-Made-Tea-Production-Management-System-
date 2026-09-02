import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import webpush from 'web-push'; 
import cron from 'node-cron'; 

// --- Import the automated BM logic ---
import { updateBMStockLogic } from './localsale/controllers/monthlyBalanceController.js'; 

import greenLeafRouter from './router/greenLeafRouter.js';
import productionRouter from './router/productionRouter.js';
import dehydratorRouter from './router/dehydratorRouter.js';
import costOfProductionRouter from './router/costOfProductionRoutes.js';
import authRouter from './router/authRoute.js';
import rawMaterialCostRoutes from './router/rawMaterialCostRoutes.js';
import userRouter from './router/userRouter.js';
import sellingDetailsRouter from './router/sellingDetailsRoutes.js';
import productionSummaryRouter from './router/productionSummaryRoute.js';
import loftLeafCountRoutes from './router/loftLeafCountRoutes.js';
import labourRouter from './router/labourRoutes.js';

// Packing Section Routes
import localSaleRouter from './Packing/Routes/localSaleRoutes.js';
import teaCenterIssueRouter from './Packing/Routes/teaCenterIssueRouter.js';

import packingTransferRouter from './Packing/Routes/packingTransferRouter.js';
import handmadeTransferRouter from './router/handmadeTransferRouter.js';
import teaReceivedRouter from './Packing/Routes/TeaReceivedRouter.js';
import packingStockRouter from './Packing/Routes/packingStockRoutes.js';
import teaTransactionOtherRouter from './Packing/Routes/teaTransactionOtherRouter.js';
import rawMaterialInRouter from './Packing/Routes/rawMaterialInRouter.js';
import restoreTeaStockRouter from './Packing/Routes/restoreTeaStockrouter.js';

// Factory Section Routes
import factoryrouter from './factory/router/factoryRoutes.js';
import StockAdjustmentRouter from './Packing/Routes/stockAdjustmentRoutes.js';
import labourOutputRouter from './factory/router/labourOutputRoutes.js';
import factoryPackRoutes from './factory/router/factoryPackRoutes.js';

// Local Sale Section Routes
import Subscription from './Packing/models/SubscriptionModel.js';
import dailySummaryRouter from './localsale/routes/dailySummaryRoutes.js';
import issueTypeRouter from './localsale/routes/issueTypeRoutes.js';
import monthlyBalanceRouter from './localsale/routes/monthlyBalanceRoutes.js';


// Manufacturer Section Routes
import factoryLoftLeafRouter from './manufacturer/routes/loftLeafRoutes.js';
import WitherLeafRouter from './manufacturer/routes/witherLeafRouter.js';
import rollingRouter from './manufacturer/routes/rollingRoomSheetRoutes.js';
import FiringRouter from './manufacturer/routes/firingSectionRoutes.js';
import hydroMeterRouter from './manufacturer/routes/hydroMeterRoutes.js';
import { Production } from './models/Production.js';
import pdfTotalRouter from './manufacturer/routes/pdfTotalRoutes.js';

dotenv.config();
const app = express();

// --- Web Push VAPID Setup (Aluthin) ---
webpush.setVapidDetails(
  process.env.EMAIL,
  process.env.PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

// Enable CORS for all routes
app.use(cors());

// Middleware 
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// --- AUTOMATED END-OF-MONTH B/M STOCK JOB ---
// Runs at 00:01 (1 minute past midnight) on the 1st day of every month
cron.schedule('1 0 1 * *', async () => {
    try {
        console.log('Running Automated End-of-Month B/M Stock Calculation...');
        
        // Get the month that just finished
        const today = new Date();
        today.setMonth(today.getMonth() - 1);
        const prevMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        await updateBMStockLogic(prevMonthStr);
        console.log(`Successfully generated new B/M stock based on ${prevMonthStr} data.`);
    } catch (error) {
        console.error('Automated B/M Stock Generation Failed:', error);
    }
});
// ==============================================================
// 💡 අලුත්: DAILY MORNING JOB - EXPECTED DRYER DATE NOTIFICATIONS
// ==============================================================
// Runs at 07:00 AM every day
cron.schedule('30 8 * * *', async () => {
    try {
        console.log('Checking for pending dryer tasks for today...');
        
        // අද දිනය ලබාගැනීම (Format: YYYY-MM-DD)
        const todayDate = new Date().toISOString().split('T')[0];
        
        // Production Collection එකෙන් අද දිනට (Expected Dryer Date) අදාළව ඇති Tasks සෙවීම
        // මෙහි "madeTeaWeight: 0" වැනි Filter එකක් දැමීමෙන් දැනටමත් කම්ප්ලීට් වුණු ඒවා මඟ හැරිය හැක.
        const pendingTasks = await Production.find({
            expectedDryerDate: { $regex: `^${todayDate}` }
        });

        if (pendingTasks.length > 0) {
            console.log(`Found ${pendingTasks.length} tasks for today. Sending notifications...`);

            // Handmade අංශයේ Users ලාගේ Subscriptions පමණක් ලබාගැනීම
            // (ඔබ Subscription model එකේ role එක save කරන්නේ නැත්නම්, 'await Subscription.find({})' යොදා සියලුම දෙනාට යැවිය හැක)
            const subscriptions = await Subscription.find({}); 
            
            const payload = JSON.stringify({
                title: 'Dryer Tasks Pending Today! 🍂',
                body: `You have ${pendingTasks.length} handmade/production task(s) scheduled to be dried today. Please check the system.`,
                // Action link එකක් click කරාම යන්න ඕන තැන
                data: { url: '/view-green-leaf' } 
            });

            // අදාළ සියලුම Devices වලට Notification එක යැවීම
            const sendPromises = subscriptions.map(sub => 
                webpush.sendNotification(sub, payload).catch(err => {
                    console.error('Push error (maybe unsubscribed):', err.statusCode);
                    // අවශ්‍ය නම් Expired වුණු subscriptions DB එකෙන් අයින් කරන්න මෙතන කේතය ලිවිය හැක.
                })
            );

            await Promise.all(sendPromises);
            console.log('Daily dryer notifications sent successfully.');
        } else {
            console.log('No pending dryer tasks for today.');
        }
    } catch (error) {
        console.error('Daily Notification Cron Job Failed:', error);
    }
});

app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        const subscription = req.body;

        await Subscription.findOneAndUpdate(
            { endpoint: subscription.endpoint }, 
            subscription,
            { upsert: true, new: true }
        );

        res.status(201).json({ message: "Subscription saved successfully." });

        const payload = JSON.stringify({ 
            title: 'Notifications Enabled ✅', 
            body: 'You will now receive alerts for new transfers.' 
        });

        webpush.sendNotification(subscription, payload)
            .catch(err => console.error('Notification sending error:', err));

    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({ error: "Failed to save subscription" });
    }
});


// Routes
app.use('/api/auth', authRouter); 
app.use('/api/green-leaf', greenLeafRouter);
app.use('/api/production', productionRouter);
app.use('/api/labour', labourRouter);
app.use('/api/dehydrator', dehydratorRouter);
app.use('/api/cost-of-production', costOfProductionRouter);
app.use('/api/raw-material-cost', rawMaterialCostRoutes);
app.use('/api/users', userRouter); 
app.use('/api/selling-details', sellingDetailsRouter);
app.use('/api/production-summary', productionSummaryRouter); 
app.use('/api/handmade/transfers', handmadeTransferRouter);
app.use('/api/loft-leaf', loftLeafCountRoutes);

// Packing Section Routes
app.use('/api/local-sales', localSaleRouter);
app.use('/api/tea-center-issues', teaCenterIssueRouter);
app.use('/api/packing/transfers', packingTransferRouter);
app.use('/api/tea-received', teaReceivedRouter);
app.use('/api/packing-stock', packingStockRouter);
app.use('/api/tea-receivedother', teaTransactionOtherRouter);
app.use('/api/raw-materials-in', rawMaterialInRouter);
app.use('/api/restore-tea-stock', restoreTeaStockRouter);

// Factory Section Routes
app.use('/api/factory-balance', factoryrouter);
app.use('/api/factory-logs', factoryrouter);
app.use('/api/labour-output', labourOutputRouter);
app.use('/api/stock-adjustment', StockAdjustmentRouter);
app.use('/api/factory-packs', factoryPackRoutes);

// Local Sale Section Routes
app.use('/api/summary', dailySummaryRouter); 
app.use('/api/issue-summary', issueTypeRouter);
app.use('/api/monthly-balance', monthlyBalanceRouter); 

// Manufacturer Section Routes
app.use('/api/factory-loft-leaf', factoryLoftLeafRouter);
app.use('/api/wither-leaf', WitherLeafRouter);
app.use('/api/rolling-room-sheet', rollingRouter); 
app.use('/api/firing-section', FiringRouter); 
app.use('/api/hydro-meters', hydroMeterRouter);
app.use('/api/pdf-totals', pdfTotalRouter);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});