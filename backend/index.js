import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import userRouter from './router/userRouter.js';
import authjwt from './middleware/auth.js';
import dotenv from 'dotenv';
import cors from 'cors';
import jobRouter from './router/jobRouter.js';
import customerRouter from './router/customerRouter.js';
import coverRouter from './router/coverRoter.js';
import otherCoverRouter from './router/otherCoverRouter.js';
import innerPageRouter from './router/innerPageRouter.js';

dotenv.config();
const app = express();
// Enable CORS for all routes
app.use(cors());
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL).then
(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});

// Middleware 
app.use(bodyParser.json());

app.use(authjwt)

app.use("/api/user", userRouter);
app.use("/api/job", jobRouter);
app.use("/api/customer", customerRouter);
app.use("/api/cover", coverRouter);
app.use("/api/othercover", otherCoverRouter);
app.use("/api/innerpage", innerPageRouter);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

