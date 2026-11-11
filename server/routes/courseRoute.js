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
  validateYouTubeUrl,
} from "../controller/courseController.js";
import isAuth from "../middleware/isAuth.js";
import requireInstitutionMembership from "../middleware/requireInstitutionMembership.js";
import { requireEducator, requirePermission } from "../middleware/rbac.js";
import { PERMISSIONS } from "../utils/permissions.js";
import upload from "../middleware/multer.js";

const courseRouter = Router();

// Student course data is available only after sign-in and institution selection.
courseRouter.get("/getpublished", isAuth, requireInstitutionMembership, getPublishedCourses);
courseRouter.get("/by-institution/:slug", isAuth, requireInstitutionMembership, getPublishedCoursesBySlug);
courseRouter.get("/getcourse/:courseId", isAuth, requireInstitutionMembership, getCourseById);
courseRouter.post("/creator", isAuth, requireInstitutionMembership, getCreatorById);

// Authenticated Student Endpoints
courseRouter.get("/courselecture/:courseId", isAuth, requireInstitutionMembership, getCourseLecture);
courseRouter.get("/lecture/:lectureId/playback", isAuth, requireInstitutionMembership, getLecturePlayback);

// Educator / Admin Management Endpoints
courseRouter.post("/create", isAuth, requirePermission(PERMISSIONS.CREATE_COURSE), createCourse);
courseRouter.get("/getcreator", isAuth, requireEducator, getCreatorCourses);
courseRouter.post("/youtube/validate", isAuth, requireEducator, validateYouTubeUrl);
courseRouter.post("/editcourse/:courseId", isAuth, requireEducator, upload.single("thumbnail"), editCourse);
courseRouter.delete("/remove/:courseId", isAuth, requireEducator, removeCourse);

// Lecture Management Endpoints
courseRouter.post("/createlecture/:courseId", isAuth, requireEducator, upload.single("video"), createLecture);
courseRouter.post("/editlecture/:lectureId", isAuth, requireEducator, upload.single("videoUrl"), editLecture);
courseRouter.delete("/removelecture/:lectureId", isAuth, requireEducator, removeLecture);

export default courseRouter;
