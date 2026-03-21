import express, { Router } from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/connectDB.js';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoute.js';
import userRouter from './routes/userRoute.js';
import cors from 'cors'
import courseRouter from './routes/courseRoute.js';
import paymentRouter from './routes/paymentRoute.js';

const app = express();
dotenv.config();
const PORT = process.env.PORT  ||8000;

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true,    
}))
app.use("/api/auth",authRouter);
app.use("/api/user",userRouter);
app.use("/api/course",courseRouter);

app.use("/api/order",paymentRouter);

app.listen(PORT,()=>{
    console.log(`Listening at ${PORT}`);
    connectDB();
})