import express, { Router } from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/connectDB.js';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoute.js';

const app = express();
dotenv.config();
const PORT = process.env.PORT  ||8000;

// middlewares
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",authRouter);

app.listen(PORT,()=>{
    console.log(`Listening at ${PORT}`);
    connectDB();
})