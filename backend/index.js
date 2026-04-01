import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import authjwt from './middleware/auth.js';
import dotenv from 'dotenv';
import cors from 'cors';
import greenLeafRouter from './router/greenLeafRouter.js';
import productionRouter from './router/productionRouter.js';
import labourRouter from './router/labourRoutes.js';


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

// Routes
app.use('/api/green-leaf', greenLeafRouter);
app.use('/api/production', productionRouter);
app.use('/api/labour', labourRouter);


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

