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
import requireEducatorInstitution from "../middleware/requireEducatorInstitution.js";
import { getProtectedResourcePage } from "../controller/resourceController.js";
import { createResourceOrder, verifyResourcePayment, getResourceEntitlement } from "../controller/paidResourceController.js";
import requireInstitutionMembership from "../middleware/requireInstitutionMembership.js";
import protectedPdfUpload from "../middleware/protectedPdfUpload.js";

const resourceRouter = express.Router();


// Public / Student endpoints (enforces course access check in controller)
resourceRouter.get("/course/:courseId", isAuth, requireInstitutionMembership, getCourseResources);
resourceRouter.get("/lecture/:lectureId", isAuth, requireInstitutionMembership, getLectureResources);
resourceRouter.get("/:resourceId/entitlement", isAuth, getResourceEntitlement);
resourceRouter.get("/:resourceId/pages/:pageNumber", isAuth, getProtectedResourcePage);
resourceRouter.post("/:resourceId/order", isAuth, createResourceOrder);
resourceRouter.post("/:resourceId/verify", isAuth, verifyResourcePayment);

// Educator / Admin resource management
resourceRouter.post(
  "/upload",
  isAuth,
  requireEducatorInstitution,
  requireEducator,
  upload.single("file"),
  uploadResource
);

resourceRouter.post(
  "/upload-secure",
  isAuth,
  requireEducatorInstitution,
  requireEducator,
  protectedPdfUpload,
  (req, _res, next) => { req.securePdfUpload = true; next(); },
  uploadResource
);

resourceRouter.put(
  "/:id",
  isAuth,
  requireEducatorInstitution,
  requireEducator,
  upload.single("file"),
  updateResource
);

resourceRouter.delete(
  "/:id",
  isAuth,
  requireEducatorInstitution,
  requireEducator,
  deleteResource
);

export default resourceRouter;

