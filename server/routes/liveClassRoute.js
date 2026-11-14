import { Router } from "express";
import {
  activateLiveClass,
  cancelLiveClass,
  createLiveClass,
  endLiveClass,
  getCurrentLiveClass,
  getLiveClassPlayback,
  listLiveClasses,
  updateLiveClass,
  validateLiveClassYouTubeUrl,
} from "../controller/liveClassController.js";
import isAuth from "../middleware/isAuth.js";
import requireInstitutionMembership from "../middleware/requireInstitutionMembership.js";
import { requireLiveClassManager } from "../middleware/rbac.js";
import requireEducatorInstitution from "../middleware/requireEducatorInstitution.js";

const router = Router();

// Student playback/read routes resolve tenant context and membership on the server.
router.get("/current", isAuth, requireInstitutionMembership, getCurrentLiveClass);
router.get("/:liveClassId/playback", isAuth, requireInstitutionMembership, getLiveClassPlayback);

// Educator controls are always scoped to req.tenantId by auth and role middleware.
router.get("/", isAuth, requireLiveClassManager, listLiveClasses);
router.post("/validate-youtube", isAuth, requireLiveClassManager, validateLiveClassYouTubeUrl);
router.post("/", isAuth, requireEducatorInstitution, requireLiveClassManager, createLiveClass);
router.put("/:liveClassId", isAuth, requireEducatorInstitution, requireLiveClassManager, updateLiveClass);
router.post("/:liveClassId/activate", isAuth, requireEducatorInstitution, requireLiveClassManager, activateLiveClass);
router.post("/:liveClassId/end", isAuth, requireEducatorInstitution, requireLiveClassManager, endLiveClass);
router.delete("/:liveClassId", isAuth, requireEducatorInstitution, requireLiveClassManager, cancelLiveClass);

export default router;
