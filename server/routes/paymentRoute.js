import express from "express";
import { RazorpayOrder, verifyPayment } from "../controller/orderController.js";
import isAuth from "../middleware/isAuth.js";

const paymentRouter = express.Router();

// Order creation and payment verification require authentication
paymentRouter.post("/razorpay-order", isAuth, RazorpayOrder);
paymentRouter.post("/verifypayment", isAuth, verifyPayment);

export default paymentRouter;
