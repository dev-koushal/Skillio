import Course from "../models/coursesModel.js";
import uploadCloudinary from "../config/cloudinary.js";

export const createCourse = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ message: "All detail needed" });
    }

    const course = await Course.create({
      title,
      category,
      creator: req.userId,
    });
   
    return res.status(200).json(course);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: `createCourse error ${error}` });
  }
};

export const getPublishedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true });
    if (!courses) {
      return res.status(400).json({ message: "Courses not found" });
    }
    return res.status(200).json(courses);
  } catch (error) {
    return res
      .status(400)
      .json({ message: `failed in getting published courses ${error}` });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.userId;
    const courses = await Course.find({ creator: userId });
    if (!courses) {
      return res.status(400).json({ message: "Courses not found" });
    }
    return res.status(200).json({courses});
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: `failed to get creator courses ${error}` });
  }
};

export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      subTitle,
      description,
      category,
      level,
      isPublished,
      price,
    } = req.body;
    let thumbnail;
    if (req.file) {
      thumbnail = await uploadCloudinary(req.file.path);
    }
    let course = await Course.findById(courseId);

    if (!course) {
      return res.status(400).json({ message: "Courses not found" });
    }

    const updateData = {
      title,
      subTitle,
      description,
      category,
      level,
      isPublished,
      price,
      thumbnail,
    };

    course = await Course.findByIdAndUpdate(courseId, updateData, {
       returnDocument: 'after'
    });
    return res.status(200).json(course);
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: `failed to get edit courses ${error}` });
  }
};

export const getCourseById = async (req, res) => {
  try {
    let { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(400).json({ message: "Courses not found" });
    }
    return res.status(200).json(course);
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: `failed to get course by ID ${error}` });
  }
};

export const removeCourse = async (req, res) => {
  try {
    let { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(400).json({ message: "Courses not found" });
    }

    course = await Course.findByIdAndDelete(courseId, { new: true });
    return res.status(200).json({ message: "Course Removed!" });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ message: `failed to delete course by ID ${error}` });
  }
};
