import express, { Router } from "express";
import {
  createCourse,
  createLecture,
  editCourse,
  editLecture,
  getCourseById,
  getCourseLecture,
  getCreatorById,
  getCreatorCourses,
  getLecturePlayback,
  getPublishedCourses,
  getPublishedCoursesBySlug,
  removeCourse,
  removeLecture,
} from "../controller/courseController.js";
import isAuth from "../middleware/isAuth.js";
import { requireEducator } from "../middleware/rbac.js";
import upload from "../middleware/multer.js";

const courseRouter = Router();

// Public / Student Accessible Course Endpoints
courseRouter.get("/getpublished", getPublishedCourses);
courseRouter.get("/by-institution/:slug", getPublishedCoursesBySlug);
courseRouter.get("/getcourse/:courseId", getCourseById);
courseRouter.post("/creator", getCreatorById);

// Authenticated Student Endpoints
courseRouter.get("/courselecture/:courseId", isAuth, getCourseLecture);
courseRouter.get("/lecture/:lectureId/playback", getLecturePlayback);

// Educator / Admin Management Endpoints
courseRouter.post("/create", isAuth, requireEducator, createCourse);
courseRouter.get("/getcreator", isAuth, requireEducator, getCreatorCourses);
courseRouter.post("/editcourse/:courseId", isAuth, requireEducator, upload.single("thumbnail"), editCourse);
courseRouter.delete("/remove/:courseId", isAuth, requireEducator, removeCourse);

// Lecture Management Endpoints
courseRouter.post("/createlecture/:courseId", isAuth, requireEducator, upload.single("video"), createLecture);
courseRouter.post("/editlecture/:lectureId", isAuth, requireEducator, upload.single("videoUrl"), editLecture);
courseRouter.delete("/removelecture/:lectureId", isAuth, requireEducator, removeLecture);

export default courseRouter;
