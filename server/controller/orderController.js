import Razorpay from "razorpay";
import dotenv from "dotenv";
import Course from "../models/coursesModel.js";
import User from "../models/userModel.js";
import CourseAccess from "../models/courseAccessModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { verifyRazorpayCoursePayment } from "../utils/razorpayPaymentVerification.js";

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

    const coursePrice = Number(course.price || 0);
    if (!Number.isFinite(coursePrice) || coursePrice < 0) {
      return res.status(400).json({ success: false, message: "This course has an invalid price and cannot be purchased." });
    }

    const isCreator = userId && course.creator.toString() === userId.toString();
    if (req.userRole !== "student" && !isCreator) {
      return res.status(403).json({ success: false, message: "Only students can enroll in courses." });
    }
    if (!course.isPublished && !isCreator) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }
    if (!isCreator) {
      const membership = await InstitutionMembership.findOne({
        userId,
        tenantId,
        role: "student",
        status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
      });
      if (!membership) {
        return res.status(403).json({
          success: false,
          code: "INSTITUTION_MEMBERSHIP_REQUIRED",
          message: "Join this institution before enrolling in its courses.",
        });
      }
    }

    if (!isCreator && course.enrolledStudents?.some((id) => id.toString() === userId?.toString())) {
      return res.status(409).json({
        success: false,
        code: "COURSE_ALREADY_ENROLLED",
        message: "You already have access to this course.",
      });
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
    if (coursePrice === 0) {
      return res.status(200).json({
        id: `free_${courseId}_${Date.now()}`,
        amount: 0,
        currency: "INR",
        free: true,
        message: "Free course, no payment required",
      });
    }

    const instance = getRazorpayInstance();
    if (!instance && process.env.NODE_ENV === "production") {
      return res.status(503).json({ success: false, message: "Course payments are temporarily unavailable." });
    }
    if (!instance) {
      // Return simulated mock order for testing/development if keys not provided
      return res.status(200).json({
        id: `order_mock_${Date.now()}`,
        amount: Math.round(coursePrice * 100),
        currency: "INR",
        receipt: courseId.toString(),
        mock: true,
      });
    }

    const options = {
      amount: Math.round(coursePrice * 100),
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

    const coursePrice = Number(course.price || 0);
    if (!Number.isFinite(coursePrice) || coursePrice < 0) {
      return res.status(400).json({ success: false, message: "This course has an invalid price and cannot be purchased." });
    }
    const isFreeCourse = coursePrice === 0;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }
    const isCreator = course.creator?.toString() === userId.toString();
    if (!isCreator && user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students can enroll in courses." });
    }
    if (!course.isPublished && !isCreator) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    if (!isCreator) {
      const membership = await InstitutionMembership.findOne({
        userId,
        tenantId,
        role: "student",
        status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
      });
      if (!membership) {
        return res.status(403).json({
          success: false,
          code: "INSTITUTION_MEMBERSHIP_REQUIRED",
          message: "Join this institution before enrolling in its courses.",
        });
      }
    }

    const instance = getRazorpayInstance();
    const isDev = process.env.NODE_ENV !== "production";
    let accessSource = isFreeCourse || isCreator ? "FREE" : "PURCHASED";

    if (isCreator || isFreeCourse) {
      // No payment is needed for the creator or a genuinely free course.
    } else if (freeEnrollment) {
      return res.status(400).json({
        success: false,
        message: "Free enrollment bypass is not allowed on paid courses. Complete payment to enroll.",
      });
    } else if (razorpay_order_id?.startsWith("creator_")) {
      return res.status(400).json({ success: false, message: "Creator enrollment is not valid for this account." });
    } else if (razorpay_order_id?.startsWith("order_mock_")) {
      if (!isDev) {
        return res.status(403).json({
          success: false,
          message: "Mock payment orders are strictly forbidden in production mode.",
        });
      }
    } else if (instance && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const verification = await verifyRazorpayCoursePayment({
        instance,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        secret: process.env.RAZORPAY_KEY_SECRET?.trim(),
        userId,
        tenantId,
        courseId,
        amountPaise: Math.round(coursePrice * 100),
      });
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.reason });
      }
    } else {
      return res.status(400).json({ success: false, message: "Incomplete payment verification parameters" });
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
    if (user.role === "student") await InstitutionMembership.findOneAndUpdate(
      {
        userId,
        tenantId,
        role: "student",
        status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
      },
      {
        $set: { lastActiveAt: new Date() },
      },
      { new: true }
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
