import { ROLES } from "../utils/permissions.js";
import requireEducatorInstitution from "./requireEducatorInstitution.js";
import requireInstitutionMembership from "./requireInstitutionMembership.js";

export default function requireNoteCatalogAccess(req, res, next) {
  if (req.userRole === ROLES.EDUCATOR || req.userRole === "tenant_admin") {
    return requireEducatorInstitution(req, res, next);
  }
  if (req.userRole === ROLES.PLATFORM_ADMIN) return next();
  return requireInstitutionMembership(req, res, next);
}
