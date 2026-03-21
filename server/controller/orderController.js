import Razorpay from "razorpay";
import dotenv from "dotenv";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";

dotenv.config();

const RazorPayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// CREATE ORDER
export const RazorpayOrder = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const options = {
      amount: course.price * 100,
      currency: "INR",
      receipt: courseId.toString(),
    };

    const order = await RazorPayInstance.orders.create(options);

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to create order: ${error.message}`,
    });
  }
};

// VERIFY PAYMENT + ENROLL
export const verifyPayment = async (req, res) => {
  try {
    const { courseId, userId, razorpay_order_id } = req.body;

    console.log("verify hit");

    const orderInfo = await RazorPayInstance.orders.fetch(
      razorpay_order_id
    );

    if (orderInfo.status !== "paid") {
      return res.status(400).json({ message: "Payment failed" });
    }

    // USER UPDATE
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.enrolledCourses.some(id => id.toString() === courseId)) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }

    // COURSE UPDATE
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!course.enrolledStudents.some(id => id.toString() === userId)) {
      course.enrolledStudents.push(userId);
      await course.save();
    }

    return res.status(200).json({
      message: "Payment verified and enrolled successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
};