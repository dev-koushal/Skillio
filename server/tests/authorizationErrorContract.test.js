import assert from "node:assert/strict";
import standardizeAuthorizationResponses from "../middleware/standardizeAuthorizationResponses.js";

const run = (statusCode, body) => {
  let output;
  const res = { statusCode, json(value) { output = value; return this; } };
  standardizeAuthorizationResponses({}, res, () => {});
  res.json(body);
  return output;
};

assert.deepEqual(run(401, { message: "Token is invalid" }), {
  message: "You need to sign in to continue.", success: false, code: "UNAUTHENTICATED",
});
assert.deepEqual(run(403, { message: "Access denied: requires one of [educator, platform_admin] roles" }), {
  message: "You don't have permission to perform this action.", success: false, code: "FORBIDDEN",
});
assert.deepEqual(run(403, { code: "INSTITUTION_ACCESS_DENIED", message: "internal detail" }), {
  code: "INSTITUTION_ACCESS_DENIED", message: "You don't have permission to manage this institution.", success: false,
});
console.log("[PASS] API authorization responses use stable codes and never expose internal role checks");
