import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import User from "../models/userModel.js"

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
    const courses = await Course.find({ isPublished: true }).populate("lectures");
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
    const courses = await Course.find({ creator: userId }).populate("lectures");
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
    const course = await Course.findById(courseId).populate("lectures");
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
    const { courseId } = req.params;

    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(200).json({ message: "Course Removed!" });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: `Failed to delete course: ${error.message}`
    });
  }
};


//Lecture controllers



export const createLecture = async (req,res) => {
  try {
    const {lectureTitle} = req.body
    const {courseId}  = req.params
    if(!lectureTitle || !courseId){
      return res.status(400).json({message:"lectureTitle is required"})
    }
    const lecture = await Lecture.create({lectureTitle})
 
    const course = await Course.findById(courseId)
    if(course){
        course.lectures.push(lecture._id)
    }
     
   await course.populate("lectures")
   await course.save()
    return res.status(201).json({lecture,course})
  } catch (error) {
    return res.status(500).json({message:`failed to create Lecture ${error}`});
  }
}

export const getCourseLecture = async (req,res) => {
  try {
      const {courseId} = req.params

      const course = await Course.findById(courseId)

      if(!course){
        return res.status(404).json({message:"Course is not found!"})
      }
      await course.populate("lectures")
      await course.save();
      return res.status(200).json(course)

  } catch (error) {
    return res.status(500).json({message:`failed to get Lecture ${error}`});
  }
}

export const editLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { isPreviewFree, lectureTitle } = req.body;

    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: "Lecture is not found!" });
    }

    if (req.file) {
      const videoUrl = await uploadCloudinary(req.file.path);
      lecture.videoUrl = videoUrl;
    }

    if (lectureTitle) {
      lecture.lectureTitle = lectureTitle;
    }

    if (typeof isPreviewFree !== "undefined") {
      lecture.isPreviewFree = isPreviewFree;
    }

    await lecture.save();

    return res.status(200).json(lecture);
  } catch (error) {
    return res.status(500).json({
      message: `failed to edit Lecture ${error.message}`,
    });
  }
};

export const removeLecture = async (req,res) => {
  try {
    const {lectureId} = req.params

    let lecture = await Lecture.findByIdAndDelete(lectureId);

    if(!lecture){
      return res.status(400).json({message:"There is error in getting lecture!!"})
    }
    await Course.updateOne(
      {lectures:lectureId},
      {$pull:{lectures:lectureId}}
    )
    return res.status(200).json({message:"Lecture removed successfully!!"})
  } catch (error) {
    return res.status(500).json({message:`failed to remove Lecture ${error}`});
  }
}

export const getCreatorById= async (req,res) => {
  try {
    const {userId} = req.body

    const user = await User.findById(userId).select("-password")

     if(!user){
      return res.status(400).json({message:"No  User Found."})
    }
    return res.status(200).json(user)
  
  } catch (error) {
     return res.status(500).json({message:`failed to get creator ${error}`});
  }
}