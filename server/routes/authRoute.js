import express from "express";
import { login, logout, resetPassword, sendOtp, signUp, verifyOtp } from "../controller/authController.js";

const authRouter = express.Router();

authRouter.post('/signup',signUp);
authRouter.post('/login',login);
authRouter.get('/logout',logout);
authRouter.post("/sendotp",sendOtp);
authRouter.post("/verifyotp",verifyOtp);
authRouter.post("/resetpassword",resetPassword);
export default authRouter;