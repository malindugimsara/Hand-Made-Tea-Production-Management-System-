import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cron from 'node-cron'; 
import { verifyToken, authorizeSection } from './middleware/auth.js'; 
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'; 

// --- Import the automated BM logic ---
import { updateBMStockLogic } from './localsale/controllers/monthlyBalanceController.js'; 

// Notification Routes & Cron
import notificationRoutes from './routes/notificationRoutes.js';
import { startNotificationCron } from './controllers/notificationController.js'; 

// Handmade Section Routes
import greenLeafRouter from './routes/greenLeafRoutes.js';
import productionRouter from './routes/productionRoutes.js';
import dehydratorRouter from './routes/dehydratorRoutes.js';
import costOfProductionRouter from './routes/costOfProductionRoutes.js';
import authRouter from './routes/authRoutes.js';
import rawMaterialCostRoutes from './routes/rawMaterialCostRoutes.js';
import userRouter from './routes/userRoutes.js';
import sellingDetailsRouter from './routes/sellingDetailsRoutes.js';
import productionSummaryRouter from './routes/productionSummaryRoutes.js';
import loftLeafCountRoutes from './routes/loftLeafCountRoutes.js';
import labourRouter from './routes/labourRoutes.js';
import handmadeTransferRouter from './routes/handmadeTransferRoutes.js';

// Packing Section Routes
import localSaleRouter from './Packing/routes/localSaleRoutes.js';
import packingTransferRouter from './Packing/routes/packingTransferRoutes.js';
import teaReceivedRouter from './Packing/routes/teaReceivedRoutes.js';
import packingStockRouter from './Packing/routes/packingStockRoutes.js';
import teaTransactionOtherRouter from './Packing/routes/teaTransactionOtherRoutes.js';
import rawMaterialInRouter from './Packing/routes/rawMaterialInRoutes.js';
import restoreTeaStockRouter from './Packing/routes/restoreTeaStockRoutes.js';
import StockAdjustmentRouter from './Packing/routes/stockAdjustmentRoutes.js';
import teaCenterIssueRouter from './Packing/routes/teaCenterIssueRoutes.js';

// Factory Section Routes
import factoryrouter from './factory/routes/factoryRoutes.js';
import labourOutputRouter from './factory/routes/labourOutputRoutes.js';
import factoryPackRoutes from './factory/routes/factoryPackRoutes.js';

// Local Sale Section Routes
import dailySummaryRouter from './localsale/routes/dailySummaryRoutes.js';
import issueTypeRouter from './localsale/routes/issueTypeRoutes.js';
import monthlyBalanceRouter from './localsale/routes/monthlyBalanceRoutes.js';

// Manufacturer Section Routes
import factoryLoftLeafRouter from './manufacturer/routes/loftLeafRoutes.js';
import WitherLeafRouter from './manufacturer/routes/witherLeafRoutes.js';
import FiringRouter from './manufacturer/routes/firingSectionRoutes.js';
import hydroMeterRouter from './manufacturer/routes/hydroMeterRoutes.js';
import pdfTotalRouter from './manufacturer/routes/pdfTotalRoutes.js';
import tc5router from './manufacturer/routes/tc5ReportRoutes.js';
import tc5ManualReportRouter from './manufacturer/routes/tc5ManualReportRoutes.js';
import rollingRoomSheetRouter from './manufacturer/routes/rollingRoomSheetRoutes.js';

// System Report Section Routes
import systemReportRouter from './system-report/routes/systemUpdateRoutes.js';
import systemInvoiceRoute from './system-report/routes/systemInvoiceRoutes.js';
import auditRoutes from './system-report/routes/auditRoutes.js';
import backupRouter from './system-report/routes/backupRoutes.js';
import { performNativeBackup } from './system-report/controllers/backupController.js';

dotenv.config();
const app = express();

// Enable trust proxy for rate limiters behind reverse proxies (Nginx, Render, Railway, etc.)
app.set('trust proxy', 1);

// Security HTTP Headers & hide technology stack (X-Powered-By)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.disable('x-powered-by');

// CORS configuration: Whitelist specific origins instead of wildcard (*)
const cleanOrigin = (url) => url ? url.trim().replace(/\/+$/, '') : '';

const envOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(cleanOrigin)
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://unifiedmanagementsystemathukoralagroup.vercel.app',
  cleanOrigin(process.env.CLIENT_URL),
  cleanOrigin(process.env.FRONTEND_URL),
  ...envOrigins
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    const normOrigin = origin ? origin.replace(/\/+$/, '') : origin;
    // Allow requests with no origin (like mobile apps, curl, or Postman) or matching whitelist
    if (!normOrigin || allowedOrigins.includes(normOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${normOrigin}`);
      callback(new Error('CORS policy: Access denied from this origin.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware 
app.use(bodyParser.json());

// Sanitize user-supplied data to prevent MongoDB Operator Injection
app.use(mongoSanitize());

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

// Scheduled Notification Jobs (e.g. Daily Dryer Tasks Alert at 08:30 AM)
startNotificationCron();

// Automated Daily Database Backup at 02:00 AM (OS-independent native backup)
cron.schedule('0 2 * * *', async () => {
    try {
        console.log('[Automated Backup] Starting scheduled database backup...');
        const result = await performNativeBackup('auto');
        console.log(`[Automated Backup] Successfully created: ${result.filename} (${result.sizeFormatted})`);
    } catch (error) {
        console.error('[Automated Backup] Failed to create scheduled backup:', error.message);
    }
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRouter); 
app.use('/api/users', userRouter); 

// Handmade Section Routes
app.use('/api/green-leaf', verifyToken, authorizeSection('handmade'), greenLeafRouter);
app.use('/api/production', verifyToken, authorizeSection('handmade'), productionRouter);
app.use('/api/labour', verifyToken, authorizeSection('handmade'), labourRouter);
app.use('/api/dehydrator', verifyToken, authorizeSection('handmade'), dehydratorRouter);
app.use('/api/cost-of-production', verifyToken, authorizeSection('handmade'), costOfProductionRouter);
app.use('/api/raw-material-cost', verifyToken, authorizeSection('handmade'), rawMaterialCostRoutes);
app.use('/api/selling-details', verifyToken, authorizeSection('handmade'), sellingDetailsRouter);
app.use('/api/production-summary', verifyToken, authorizeSection('handmade'), productionSummaryRouter); 
app.use('/api/handmade/transfers', verifyToken, authorizeSection('handmade'), handmadeTransferRouter);
app.use('/api/loft-leaf', verifyToken, authorizeSection('handmade'), loftLeafCountRoutes);

// Packing Section Routes
app.use('/api/local-sales', verifyToken, authorizeSection('packing'), localSaleRouter);
app.use('/api/tea-center-issues', verifyToken, authorizeSection('packing'), teaCenterIssueRouter);
app.use('/api/packing/transfers', verifyToken, authorizeSection({ read: ['packing', 'handmade'], write: ['packing'] }), packingTransferRouter);
app.use('/api/tea-received', verifyToken, authorizeSection('packing'), teaReceivedRouter);
app.use('/api/packing-stock', verifyToken, authorizeSection('packing'), packingStockRouter);
app.use('/api/tea-receivedother', verifyToken, authorizeSection('packing'), teaTransactionOtherRouter);
app.use('/api/raw-materials-in', verifyToken, authorizeSection('packing'), rawMaterialInRouter);
app.use('/api/restore-tea-stock', verifyToken, authorizeSection('packing'), restoreTeaStockRouter);

// Factory Section Routes
app.use('/api/factory-balance', verifyToken, authorizeSection('factory'), factoryrouter);
app.use('/api/factory-logs', verifyToken, authorizeSection({ read: ['factory', 'manufacturer'], write: ['factory'] }), factoryrouter);
app.use('/api/labour-output', verifyToken, authorizeSection('factory'), labourOutputRouter);
app.use('/api/stock-adjustment', verifyToken, authorizeSection('packing', 'factory'), StockAdjustmentRouter);
app.use('/api/factory-packs', verifyToken, authorizeSection('factory'), factoryPackRoutes);

// Local Sale Section Routes
app.use('/api/summary', verifyToken, authorizeSection({ read: ['localsale', 'manufacturer'], write: ['localsale'] }), dailySummaryRouter); 
app.use('/api/issue-summary', verifyToken, authorizeSection('localsale'), issueTypeRouter);
app.use('/api/monthly-balance', verifyToken, authorizeSection('localsale'), monthlyBalanceRouter); 

// Manufacturer Section Routes
app.use('/api/factory-loft-leaf', verifyToken, authorizeSection('manufacturer'), factoryLoftLeafRouter);
app.use('/api/wither-leaf', verifyToken, authorizeSection('manufacturer'), WitherLeafRouter);
app.use('/api/rolling-room-sheet', verifyToken, authorizeSection('manufacturer'), rollingRoomSheetRouter); 
app.use('/api/firing-section', verifyToken, authorizeSection('manufacturer'), FiringRouter); 
app.use('/api/hydro-meters', verifyToken, authorizeSection('manufacturer'), hydroMeterRouter);
app.use('/api/pdf-totals', verifyToken, authorizeSection('manufacturer'), pdfTotalRouter);
app.use('/api/tc5report', verifyToken, authorizeSection('manufacturer'), tc5router); 
app.use('/api/tc5manualreport', verifyToken, authorizeSection('manufacturer'), tc5ManualReportRouter); 

//system Report
app.use('/api/system-updates', systemReportRouter);
app.use('/api/system-invoices', systemInvoiceRoute);
app.use('/api/system-audit', auditRoutes);
app.use('/api/backup', backupRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global Error Handling Middleware (must be after all route declarations)
app.use(errorHandler);

// Process-level unhandled rejection & uncaught exception handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
