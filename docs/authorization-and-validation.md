# Authorization and validation policy

## Product roles

The canonical user roles are `student`, `educator`, and `platform_admin`. Institution ownership is a relationship recorded by `Tenant.ownerId`; it is not a user role. An educator keeps the educator role after creating an institution.

## Permission matrix

| Permission | Student | Educator | Platform admin |
| --- | --- | --- | --- |
| Use educator workspace | No | Yes, in assigned institution | Yes |
| Create courses | No | Institution owner only | Yes |
| Manage a course | No | Creator or owning educator, same institution | Yes |
| Manage institution settings, students, or live classes | No | Owning educator, same institution | Yes |
| Access course content | Enrollment/grant or public preview | Creator or owning educator | Yes |
| Manage another institution | No | No | Yes |

`server/utils/permissions.js` is the backend policy source; RBAC middleware resolves the authenticated user from MongoDB and the request tenant from server-side middleware. Routes and services use the same policy. Body, query, Redux, and browser storage values do not grant backend access.

`client/src/auth/permissions.js` supplies matching UX-only route and action checks. `server/middleware/standardizeAuthorizationResponses.js` normalizes every API 401/403 response. `client/src/services/api.js` maps those stable codes to the same user-facing authorization messages. Internal role lists are logged server-side and are not sent to the browser.

| HTTP status | API code | User-facing message |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | You need to sign in to continue. |
| 403 | `FORBIDDEN` | You don't have permission to perform this action. |
| 403 | `INSTITUTION_ACCESS_DENIED` | You don't have permission to manage this institution. |
| 403 | `RESOURCE_ACCESS_DENIED` | You don't have access to this content. |

Legacy role normalization is limited to migration tooling and old-token compatibility. Before deploying the role enum change to another existing database, run `npm run migrate:educator-roles`; it only converts records whose role is exactly the retired legacy value.

Form failures use the shared toast surface; field level URL feedback uses `FieldFeedback` and the shared invalid-field styling in `client/src/index.css`. Server validation remains authoritative.
