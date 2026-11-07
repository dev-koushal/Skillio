import express from "express";
import {
  uploadResource,
  getCourseResources,
  getLectureResources,
  updateResource,
  deleteResource,
} from "../controller/resourceController.js";
import isAuth from "../middleware/isAuth.js";
import { requireEducator } from "../middleware/rbac.js";
import upload from "../middleware/multer.js";

const resourceRouter = express.Router();

// Public / Student endpoints (enforces course access check in controller)
resourceRouter.get("/course/:courseId", isAuth, getCourseResources);
resourceRouter.get("/lecture/:lectureId", isAuth, getLectureResources);

// Educator / Admin resource management
resourceRouter.post(
  "/upload",
  isAuth,
  requireEducator,
  upload.single("file"),
  uploadResource
);

resourceRouter.put(
  "/:id",
  isAuth,
  requireEducator,
  upload.single("file"),
  updateResource
);

resourceRouter.delete(
  "/:id",
  isAuth,
  requireEducator,
  deleteResource
);

export default resourceRouter;

