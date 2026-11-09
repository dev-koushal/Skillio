import express from "express";
import {
  login,
  logout,
  resetPassword,
  sendOtp,
  signUp,
  verifyOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendLinkPhoneOtp,
  verifyLinkPhoneOtp,
  linkEmail,
} from "../controller/authController.js";
import isAuth from "../middleware/isAuth.js";

const authRouter = express.Router();

authRouter.post('/signup', signUp);
authRouter.post('/login', login);
authRouter.get('/logout', logout);
authRouter.post("/sendotp", sendOtp);
authRouter.post("/verifyotp", verifyOtp);
authRouter.post("/resetpassword", resetPassword);

// Phone OTP Authentication Endpoints (E.164, rate-limited, single-use, hashed)
authRouter.post("/phone/send-otp", sendPhoneOtp);
authRouter.post("/phone/sendotp", sendPhoneOtp);
authRouter.post("/phone/verify-otp", verifyPhoneOtp);
authRouter.post("/phone/verifyotp", verifyPhoneOtp);

// Account-Linking Endpoints (Link phone to email account, or link email to phone account)
authRouter.post("/phone/link/send-otp", isAuth, sendLinkPhoneOtp);
authRouter.post("/phone/link/verify-otp", isAuth, verifyLinkPhoneOtp);
authRouter.post("/email/link", isAuth, linkEmail);

export default authRouter;