import express from "express";
import {
  getInstitutionStats,
  getInstitutionOverview,
  getInstitutionStudents,
  getInstitutionStudentDetail,
  grantCourseAccess,
  revokeCourseAccess,
  inviteStudent,
} from "../controller/institutionStudentController.js";
import isAuth from "../middleware/isAuth.js";
import { requireInstitutionStudentManager } from "../middleware/rbac.js";

const router = express.Router();

// Institution student operations are performed by authenticated educators.
router.use(isAuth);
router.use(requireInstitutionStudentManager);

// Institution statistics & lightweight overview
router.get("/stats", getInstitutionStats);
router.get("/overview", getInstitutionOverview);

// Student management
router.get("/students", getInstitutionStudents);
router.post("/students/invite", inviteStudent);
router.get("/students/:studentId", getInstitutionStudentDetail);

// Course access management
router.post("/students/:studentId/access", grantCourseAccess);
router.delete("/students/:studentId/access/:courseId", revokeCourseAccess);

export default router;

