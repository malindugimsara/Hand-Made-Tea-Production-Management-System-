import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Router Imports
import greenLeafRouter from './router/greenLeafRouter.js';
import productionRouter from './router/productionRouter.js';
import labourRouter from './router/labourRoutes.js';
import dehydratorRouter from './router/dehydratorRouter.js';
import costOfProductionRouter from './router/costOfProductionRoutes.js';
import authRouter from './router/authRoute.js';
import rawMaterialCostRoutes from './router/rawMaterialCostRoutes.js';
import userRouter from './router/userRouter.js';
import sellingDetailsRouter from './router/sellingDetailsRoutes.js';
import productionSummaryRouter from './router/productionSummaryRoute.js';
import loftLeafCountRoutes from './router/loftLeafCountRoutes.js';

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

dotenv.config();
const app = express();

// 2. CORS Configuration එක Cookies සඳහා සකස් කිරීම
// මෙහිදී 'http://localhost:5173' යනු ඔබගේ Frontend URL එක විය යුතුය. 
// Production (Live) එකට දානකොට මේක ඒ URL එකට වෙනස් කරන්න ඕනේ.
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://unifiedmanagementsystemathukoralagroup.vercel.app' 
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true 
}));


// Middleware 
app.use(helmet());
app.use(bodyParser.json());
app.use(cookieParser()); // 3. Cookie parser Middleware එක භාවිතා කිරීම

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// Routes
// Notice: We removed app.use(authjwt) from here!
// Security is now handled inside each specific Router file.

app.use('/api/auth', authRouter); // Put Auth first so people can log in!
app.use('/api/green-leaf', greenLeafRouter);
app.use('/api/production', productionRouter);
app.use('/api/labour', labourRouter);
app.use('/api/dehydrator', dehydratorRouter);
app.use('/api/cost-of-production', costOfProductionRouter);
app.use('/api/raw-material-cost', rawMaterialCostRoutes);
app.use('/api/users', userRouter); // User management routes (Admins only)
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


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});