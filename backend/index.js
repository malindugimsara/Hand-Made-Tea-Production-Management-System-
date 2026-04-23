import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
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

// Packing Section Routes
import localSaleRouter from './Packing/Routes/localSaleRoutes.js';
import teaCenterIssueRouter from './Packing/Routes/TeaCenterIssueRouter.js';

import packingTransferRouter from './Packing/Routes/packingTransferRouter.js';
import handmadeTransferRouter from './router/handmadeTransferRouter.js';
import guideIssueRouter from './Packing/Routes/guideIssueRouter.js';

dotenv.config();
const app = express();

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
app.use('/api/production-summary', productionSummaryRouter); // Add this line to include the production summary routes
app.use('/api/handmade/transfers', handmadeTransferRouter);

// Packing Section Routes

app.use('/api/local-sales', localSaleRouter);
app.use('/api/tea-center-issues', teaCenterIssueRouter);
app.use('/api/packing/transfers', packingTransferRouter);
app.use('/api/guide-issues', guideIssueRouter);


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});