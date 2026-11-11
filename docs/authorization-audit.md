# Authorization audit

This audit is paired with [authorization-and-validation.md](./authorization-and-validation.md). Role and permission logic found by repository searches is classified below by responsibility.

## Canonical policy

- **VALID, centralized:** `server/utils/permissions.js` defines product roles, permission names, legacy normalization, institution-owner checks, course/resource ownership checks.
- **VALID, enforcement:** `server/middleware/rbac.js`, `isAuth.js`, `requireInstitutionMembership.js`, `requireCourseAccess.js`, and `standardizeAuthorizationResponses.js` authenticate, resolve context, authorize, and normalize API errors.
- **VALID, UX only:** `client/src/auth/permissions.js` contains route/workspace/course action checks and user-facing role labels; server checks remain authoritative.
- **VALID, persisted model:** `server/models/userModel.js` and `institutionMembershipModel.js` accept only `student`, `educator`, and `platform_admin` user roles (memberships use student/educator).

## Domain operations checked

- **Institution and branding:** `server/controller/tenantController.js`, `server/services/tenantService.js`, `server/routes/tenantRoute.js`.
- **Courses, lectures, resources, analytics:** `server/controller/courseController.js`, `resourceController.js`, `server/services/courseService.js`, `lectureService.js`, `resourceService.js`, `analyticsService.js`, and their course/resource routes.
- **Students and invitations:** `server/controller/institutionStudentController.js`, `invitationController.js`, `server/routes/institutionStudentRoute.js`, and `invitationRoute.js`. The owner permission is checked again after the institution is resolved.
- **Live classes:** `server/controller/liveClassController.js` and `server/routes/liveClassRoute.js`. All educator mutations use the institution-owner permission for the server-resolved tenant.
- **Payments, reviews, and learning access:** `server/controller/orderController.js`, `reviewContoller.js`, `server/utils/courseAccess.js`, and `server/middleware/requireCourseAccess.js`. Student enrollment/grants remain distinct from educator management.
- **AI tools:** `server/routes/aiRoute.js`, `server/controller/aiController.js`, `server/services/aiService.js`. Educator use is role-gated; any course/institution mutation continues through the central resource permission checks.
- **Frontend roles and guards:** `client/src/App.jsx`, `auth/permissions.js`, `Navbar.jsx`, `MobileBottomNav.jsx`, `TenantSwitcher.jsx`, `getCreatorCourse.js`, `useGetPublishedCourse.js`, educator course pages, `Login.jsx`, `SignUp.jsx`, `Profile.jsx`, and `ViewCourses.jsx`.

## Inconsistency fixes

- Replaced the institution-owner account role with `educator`; ownership remains `Tenant.ownerId`.
- Replaced the role-only `requireRole` gate with `requirePermission`; course/resource checks now share `canManageCourse`, while institution settings, students, and live classes share owner-scoped permission decisions.
- Bound live-class, institution student-management, course creation, branding, invitation, analytics, and course/resource operations to the resolved institution and owner/creator context.
- Removed internal allowed-role arrays from API responses. Every HTTP 401/403 receives a stable code/message at the Express response boundary; the client normalizes the same codes before page error surfaces display them.
- Standardized field-level YouTube feedback through `FieldFeedback`, shared invalid input styling, and the app-wide toast surface for request failures.

## Legacy and duplicate findings

- In runtime code, `tenant_admin` remains only in `server/utils/permissions.js` to translate old signed tokens to educator and in `server/scripts/migrateInstitutionEducatorRoles.js` to migrate exact legacy account/membership values. The term also appears in migration documentation and one authorization regression fixture. It is not accepted by current schemas or shown in the UI.
- Repeated role predicates in frontend educator navigation now call `canUseEducatorWorkspace`. Student-specific membership and enrollment checks remain local because they are data-flow rules, not educator permission grants.
- Input constraints still live beside their fields and in backend domain validation; the shared feedback/error contract is centralized. Server validation is authoritative.

## Repository search classification

Searches covered `tenant_admin`, `educator`, `platform_admin`, `role ===` / `role !==`, role arrays, `requireRole`, `requirePermission`, `403`, `Access denied`, and permission helpers across `client/src`, `server`, and project documentation (excluding dependencies and generated bundles).

| Finding | Classification | Treatment |
| --- | --- | --- |
| `server/utils/permissions.js` role constants, normalization, and permission checks | VALID | Canonical backend policy and old-token compatibility boundary |
| `server/middleware/rbac.js`, `isAuth.js`, and membership/course access middleware | VALID | Authenticated identity and request/resource context are checked server-side |
| Student role branches in auth, enrollment, invitations, and account payloads | VALID | Select student-specific flows/data; they do not grant educator management permissions |
| Institution, course, and live-class manager checks in controllers/services | VALID | Use the central permission policy after resolving tenant/resource from the database |
| Frontend student role branches in route redirects, navigation, and student-only data loading | VALID, UX ONLY | Presentation/navigation; protected APIs repeat authorization on the server |
| `tenant_admin` in the role normalizer and exact-value migration script | LEGACY | Old tokens map to educator; migration touches only documents with that exact retired role |
| Historical `requireRole` strings in this report and contract tests | DOCUMENTATION/TEST FIXTURE | Regression case only; no production `requireRole` middleware remains |
| Product-facing tenant-admin role label or UI permission gate | NONE FOUND | No normal UI label or permission requirement remains |

## Tests

- `server/tests/authorizationPolicy.test.js`: role schema, student denial, educator ownership, course creator, platform admin, and cross-tenant cases.
- `server/tests/authorizationErrorContract.test.js`: standard 401/403 payloads and removal of role-list details.
- `client/src/auth/permissions.test.js`: matching frontend role/context logic and friendly error text.
- Full regression suite covers multi-tenant isolation, course access, students/invitations, payments, AI, and video authorization.
