import express from "express";
import {
  createCourseInvitation,
  verifyInvitation,
  acceptInvitation,
} from "../controller/invitationController.js";
import isAuth from "../middleware/isAuth.js";
import { requireInstitutionStudentManager } from "../middleware/rbac.js";

const router = express.Router();

// Educator creates secure course invitation link
router.post("/create", isAuth, requireInstitutionStudentManager, createCourseInvitation);

// Public verification of token
router.get("/verify/:token", verifyInvitation);

// Authenticated student accepts invitation
router.post("/accept", isAuth, acceptInvitation);

export default router;

