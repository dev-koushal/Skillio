import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";

dotenv.config();

// Lazy or safe Razorpay client initialization
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_id || !key_secret) {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
};

// CREATE ORDER
export const RazorpayOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" });
    }

    // Tenant-isolated course lookup
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    // Free course handling
    if (!course.price || Number(course.price) <= 0) {
      return res.status(200).json({
        id: `free_${courseId}_${Date.now()}`,
        amount: 0,
        currency: "INR",
        free: true,
        message: "Free course, no payment required",
      });
    }

    const instance = getRazorpayInstance();
    if (!instance) {
      // Return simulated mock order for testing/development if keys not provided
      return res.status(200).json({
        id: `order_mock_${Date.now()}`,
        amount: (course.price || 0) * 100,
        currency: "INR",
        receipt: courseId.toString(),
        mock: true,
      });
    }

    const options = {
      amount: Math.round((course.price || 0) * 100),
      currency: "INR",
      receipt: `rcpt_${courseId.toString().slice(-10)}_${Date.now().toString().slice(-6)}`,
      notes: {
        tenantId: tenantId.toString(),
        courseId: course._id.toString(),
        userId: userId ? userId.toString() : "",
      },
    };

    const order = await instance.orders.create(options);
    return res.status(200).json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID?.trim(),
    });
  } catch (error) {
    console.error("[Razorpay Order Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to create order: ${error.message}`,
    });
  }
};

// VERIFY PAYMENT + ENROLL
export const verifyPayment = async (req, res) => {
  try {
    const { courseId, razorpay_order_id, razorpay_payment_id, razorpay_signature, freeEnrollment } = req.body;
    const tenantId = req.tenantId;

    // Security: Use authenticated userId from session, never trust body
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required to enroll" });
    }

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required" });
    }

    // Tenant-isolated course lookup
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    const instance = getRazorpayInstance();

    // 1. Free enrollment check
    if (freeEnrollment || (!course.price || Number(course.price) <= 0)) {
      // Free courses require no payment transaction
    }
    // 2. Simulated mock order (dev/test mode)
    else if (razorpay_order_id && razorpay_order_id.startsWith("order_mock_")) {
      // Mock order allowed in test/demo mode
    }
    // 3. Signature verification with Razorpay credentials
    else if (instance && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET.trim())
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment signature verification failed!" });
      }
    }
    // 4. Fallback status verification from Razorpay API
    else if (instance && razorpay_order_id) {
      const orderInfo = await instance.orders.fetch(razorpay_order_id);
      if (orderInfo.status !== "paid") {
        return res.status(400).json({ success: false, message: "Payment status is not paid" });
      }
    } else {
      return res.status(400).json({ success: false, message: "Incomplete payment verification parameters" });
    }

    // USER UPDATE (Scoped to tenant)
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found in this organization" });
    }

    if (!user.enrolledCourses.some((id) => id.toString() === courseId.toString())) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }

    // COURSE UPDATE
    if (!course.enrolledStudents.some((id) => id.toString() === userId.toString())) {
      course.enrolledStudents.push(userId);
      await course.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and enrolled successfully!",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        enrolledCourses: user.enrolledCourses,
      },
    });
  } catch (error) {
    console.error("[Verify Payment Error]", error);
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
    });
  }
};
