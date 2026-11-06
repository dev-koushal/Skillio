import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import User from "../models/userModel.js";

export const createCourse = async (req, res) => {
  try {
    const { title, category } = req.body;
    const tenantId = req.tenantId;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: "Title and category are required" });
    }

    const course = await Course.create({
      tenantId,
      title: title.trim(),
      category: category.trim(),
      creator: req.userId,
    });

    return res.status(201).json(course);
  } catch (error) {
    console.error("[CreateCourse Error]", error);
    return res.status(400).json({ success: false, message: `createCourse error: ${error.message || error}` });
  }
};

export const getPublishedCourses = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const courses = await Course.find({ isPublished: true, tenantId })
      .populate("lectures reviews")
      .sort({ createdAt: -1 });

    return res.status(200).json(courses);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Failed to get published courses: ${error.message || error}`,
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.userId;
    const tenantId = req.tenantId;

    const courses = await Course.find({ creator: userId, tenantId })
      .populate("lectures")
      .sort({ createdAt: -1 });

    return res.status(200).json({ courses: courses || [] });
  } catch (error) {
    console.error("[GetCreatorCourses Error]", error);
    return res.status(400).json({
      success: false,
      message: `Failed to get creator courses: ${error.message || error}`,
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;
    const {
      title,
      subTitle,
      description,
      category,
      level,
      isPublished,
      price,
    } = req.body;

    // Tenant-isolated lookup
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    // Authorization: only the creator or an admin can edit
    if (course.creator.toString() !== req.userId.toString() && req.userRole !== "tenant_admin" && req.userRole !== "platform_admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to edit this course" });
    }

    const updateData = {};
    if (typeof title !== "undefined") updateData.title = title;
    if (typeof subTitle !== "undefined") updateData.subTitle = subTitle;
    if (typeof description !== "undefined") updateData.description = description;
    if (typeof category !== "undefined") updateData.category = category;
    if (typeof level !== "undefined") updateData.level = level;
    if (typeof isPublished !== "undefined") updateData.isPublished = isPublished === "true" || isPublished === true;
    if (typeof price !== "undefined") updateData.price = Number(price);

    if (req.file) {
      const thumbnail = await uploadCloudinary(req.file.path);
      if (thumbnail) updateData.thumbnail = thumbnail;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      returnDocument: "after",
    }).populate("lectures reviews");

    return res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("[EditCourse Error]", error);
    return res.status(400).json({ success: false, message: `Failed to edit course: ${error.message || error}` });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    const course = await Course.findOne({ _id: courseId, tenantId }).populate("lectures reviews");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    return res.status(200).json(course);
  } catch (error) {
    console.error("[GetCourseById Error]", error);
    return res.status(400).json({ success: false, message: `Failed to get course: ${error.message || error}` });
  }
};

export const removeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Authorization: only the creator or admin can remove
    if (course.creator.toString() !== req.userId.toString() && req.userRole !== "tenant_admin" && req.userRole !== "platform_admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this course" });
    }

    // Delete associated lectures
    await Lecture.deleteMany({ _id: { $in: course.lectures }, tenantId });
    await Course.findByIdAndDelete(courseId);

    return res.status(200).json({ success: true, message: "Course removed successfully!" });
  } catch (error) {
    console.error("[RemoveCourse Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete course: ${error.message}`,
    });
  }
};

// ================= Lecture Controllers =================

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({ success: false, message: "lectureTitle and courseId are required" });
    }

    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    if (course.creator.toString() !== req.userId.toString() && req.userRole !== "tenant_admin" && req.userRole !== "platform_admin") {
      return res.status(403).json({ success: false, message: "Not authorized to add lectures to this course" });
    }

    const lecture = await Lecture.create({
      tenantId,
      courseId,
      lectureTitle: lectureTitle.trim(),
    });

    course.lectures.push(lecture._id);
    await course.save();
    await course.populate("lectures");

    return res.status(201).json({ lecture, course });
  } catch (error) {
    console.error("[CreateLecture Error]", error);
    return res.status(500).json({ success: false, message: `Failed to create lecture: ${error.message}` });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;

    const course = await Course.findOne({ _id: courseId, tenantId }).populate("lectures");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }

    return res.status(200).json(course);
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get lecture: ${error.message}` });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;
    const { isPreviewFree, lectureTitle } = req.body;

    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found in this organization!" });
    }

    if (req.file) {
      const videoUrl = await uploadCloudinary(req.file.path);
      if (videoUrl) lecture.videoUrl = videoUrl;
    }

    if (lectureTitle) {
      lecture.lectureTitle = lectureTitle.trim();
    }

    if (typeof isPreviewFree !== "undefined") {
      lecture.isPreviewFree = isPreviewFree === "true" || isPreviewFree === true;
    }

    await lecture.save();
    return res.status(200).json(lecture);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to edit lecture: ${error.message}`,
    });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;

    const lecture = await Lecture.findOneAndDelete({ _id: lectureId, tenantId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found!" });
    }

    await Course.updateOne(
      { lectures: lectureId, tenantId },
      { $pull: { lectures: lectureId } }
    );

    return res.status(200).json({ success: true, message: "Lecture removed successfully!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to remove lecture: ${error.message}` });
  }
};

export const getCreatorById = async (req, res) => {
  try {
    const { userId } = req.body;
    const tenantId = req.tenantId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const user = await User.findOne({ _id: userId, tenantId }).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "Creator not found in this organization." });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed to get creator: ${error.message}` });
  }
};
