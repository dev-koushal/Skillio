import Course from "../models/coursesModel.js";
import Review from "../models/reviewModel.js";
import { verifyCourseAccess } from "../utils/courseAccess.js";

export const createReview = async (req, res) => {
  try {
    const { rating, comment, courseId } = req.body;
    const userId = req.userId;
    const tenantId = req.tenantId;

    if (!courseId || !rating) {
      return res.status(400).json({ success: false, message: "courseId and rating are required!" });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Tenant-isolated course check
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization!" });
    }

    const access = await verifyCourseAccess({ courseId, userId, userRole: req.userRole, tenantId });
    if (req.userRole === "student" && !access.isEnrolled) {
      return res.status(403).json({ success: false, message: "Enroll in this course before leaving a review." });
    }

    const alreadyReview = await Review.findOne({
      course: courseId,
      user: userId,
      tenantId,
    });

    if (alreadyReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this course!" });
    }

    const review = await Review.create({
      tenantId,
      course: courseId,
      user: userId,
      rating: numericRating,
      comment: comment ? comment.trim() : "",
    });

    course.reviews.push(review._id);
    await course.save();

    await review.populate("user", "name profilePicture role");

    return res.status(201).json(review);
  } catch (error) {
    console.error("[CreateReview Error]", error);
    return res.status(500).json({ success: false, message: `Failed to create review: ${error.message}` });
  }
};

export const getReviews = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const filter = { tenantId };

    // Optional filter by courseId if query param present
    if (req.query?.courseId) {
      filter.course = req.query.courseId;
    }

    const reviews = await Review.find(filter)
      .populate("user", "name profilePicture role")
      .sort({ reviewedAt: -1 })
      .limit(50);

    return res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
