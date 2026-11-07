import express from "express";
import {
  getCurrentTenant,
  getTenantBySlug,
  getInstitutionDirectory,
  createOrganizationByEducator,
  getAllTenants,
  createTenant,
  updateTenantBranding,
  updateTenantStatus,
} from "../controller/tenantController.js";
import isAuth from "../middleware/isAuth.js";
import { requireEducator, requirePlatformAdmin, requireTenantAdmin } from "../middleware/rbac.js";
import upload from "../middleware/multer.js";

const tenantRouter = express.Router();

// Public endpoints
tenantRouter.get("/current", getCurrentTenant);
tenantRouter.get("/directory", getInstitutionDirectory);
tenantRouter.get("/by-slug/:slug", getTenantBySlug);

// Educator endpoint: Create a new institution
tenantRouter.post(
  "/create-institution",
  isAuth,
  requireEducator,
  upload.single("logo"),
  createOrganizationByEducator
);

// Tenant Admin / Platform Admin endpoints
tenantRouter.put("/branding", isAuth, requireTenantAdmin, upload.single("logo"), updateTenantBranding);

// Platform Admin only endpoints
tenantRouter.get("/all", isAuth, requirePlatformAdmin, getAllTenants);
tenantRouter.post("/", isAuth, requirePlatformAdmin, upload.single("logo"), createTenant);
tenantRouter.put("/:id/status", isAuth, requirePlatformAdmin, updateTenantStatus);
tenantRouter.put("/:id/branding", isAuth, requirePlatformAdmin, upload.single("logo"), updateTenantBranding);

export default tenantRouter;

