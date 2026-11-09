import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";

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

    // Course creator bypass: Instructor never needs to purchase own course
    if (userId && course.creator.toString() === userId.toString()) {
      return res.status(200).json({
        id: `creator_${courseId}_${Date.now()}`,
        amount: 0,
        currency: "INR",
        free: true,
        mock: true,
        message: "You are the creator of this course and have full access.",
      });
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

    const isFreeCourse = !course.price || Number(course.price) <= 0;
    const isCreator = userId && course.creator && course.creator.toString() === userId.toString();
    const isDev = process.env.NODE_ENV !== "production";

    // 1. Creator enrollment requires no payment
    if (isCreator || (razorpay_order_id && razorpay_order_id.startsWith("creator_"))) {
      // Creator allowed
    }
    // 2. Free enrollment check - STRICTLY only allowed if course.price is 0
    else if (freeEnrollment || isFreeCourse) {
      if (!isFreeCourse) {
        return res.status(400).json({
          success: false,
          message: "Free enrollment bypass is not allowed on paid courses. Complete payment to enroll.",
        });
      }
    }
    // 3. Simulated mock order (dev/test mode strictly)
    else if (razorpay_order_id && razorpay_order_id.startsWith("order_mock_")) {
      if (!isDev) {
        return res.status(403).json({
          success: false,
          message: "Mock payment orders are strictly forbidden in production mode.",
        });
      }
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
    // 4. Fallback verification via Razorpay payment ID
    else if (instance && razorpay_payment_id) {
      const paymentInfo = await instance.payments.fetch(razorpay_payment_id);
      if (paymentInfo.status !== "captured" && paymentInfo.status !== "authorized") {
        return res.status(400).json({ success: false, message: `Payment not completed: status is ${paymentInfo.status}` });
      }
    }
    // 5. Fallback status verification from Razorpay order API
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

    // Record formal CourseAccess with accurate source tracking
    const accessSource = (course.price > 0 && !freeEnrollment) ? "PURCHASED" : "FREE";
    await CourseAccess.findOneAndUpdate(
      { userId, courseId, tenantId },
      {
        userId,
        courseId,
        tenantId,
        source: accessSource,
        status: "active",
        grantedAt: new Date(),
        revokedAt: null,
        revokedBy: null,
      },
      { upsert: true, new: true }
    );

    // Register or refresh student's InstitutionMembership
    await InstitutionMembership.findOneAndUpdate(
      { userId, tenantId },
      {
        userId,
        tenantId,
        role: "student",
        status: "active",
        lastActiveAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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
