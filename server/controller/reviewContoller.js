import Course from "../models/coursesModel.js";
import Review from "../models/reviewModel.js";

export const createReview = async (req, res) => {
  try {
    const { rating, comment, courseId } = req.body;
    const userId = req.userId;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(400).json({ message: "course is not found!" });
    }

    const alreadyReview = await Review.findOne({
      course: courseId,
      user: userId,
    });

    if (alreadyReview) {
      return res
        .status(400)
        .json({ message: "You already given review to this course!!" });
    }

    const review = new Review({
      course: courseId,
      user: userId,
      reating,
      comment,
    });

    await review.save();

    await course.reviews.push(review._id);
    await course.save();

    return res.status(200).json(review);
  } catch (error) {}
};

export const getReviews = async (req,res) => {
    try {
        const review = await Review.find({}).populate("user","name, photoUrl,role").sort({reviewedAt:-1})

        return res.status(200).json(review);
    } catch (error) {
        
    }
}