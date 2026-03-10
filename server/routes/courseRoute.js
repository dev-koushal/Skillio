import express, { Router } from 'express'
import {createCourse, editCourse, getCourseById, getCreatorCourses, getPublishedCourses, removeCourse} from '../controller/courseController.js'
import isAuth from '../middleware/isAuth.js'
import upload from '../middleware/multer.js'
const courseRouter = Router();

courseRouter.post("/create",isAuth, createCourse)
courseRouter.get("/getpublished",isAuth, getPublishedCourses)
courseRouter.get("/getcreator",isAuth, getCreatorCourses)
courseRouter.post("/editcourse/:courseId",isAuth, upload.single("thumbnail"),editCourse)
courseRouter.get("/getcoursebyid/:courseId",isAuth, getCourseById)
courseRouter.delete("/remove/:courseId",isAuth, removeCourse)


export default courseRouter;