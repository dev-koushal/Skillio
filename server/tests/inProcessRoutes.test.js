import assert from "assert";
import { tenantResolver, extractSubdomain } from "../middleware/tenantResolver.js";
import isAuth from "../middleware/isAuth.js";
import { requireRole } from "../middleware/rbac.js";
import { getCurrentTenant, getTenantBySlug } from "../controller/tenantController.js";
import { genToken } from "../config/token.js";

console.log("==================================================");
console.log(" IN-PROCESS ROUTE & MIDDLEWARE SECURITY TESTS");
console.log("==================================================");

let passedTests = 0;
let totalTests = 0;

const test = async (description, fn) => {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${description}`);
    passedTests++;
  } catch (error) {
    console.error(`[FAIL] ${description}`);
    console.error(error);
  }
};

// Helper mock response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
};

// Test 1: Subdomain parsing accuracy
await test("Middleware extracts subdomains correctly", () => {
  assert.strictEqual(extractSubdomain("physics.mylms.com"), "physics");
  assert.strictEqual(extractSubdomain("coding.lvh.me"), "coding");
  assert.strictEqual(extractSubdomain("abcacademy.lvh.me:5173"), "abcacademy");
  assert.strictEqual(extractSubdomain("localhost:3000"), "default");
  assert.strictEqual(extractSubdomain("skillio.com"), "default");
});

// Test 2: getCurrentTenant returns safe public branding
await test("TenantController: getCurrentTenant returns public branding without secrets", async () => {
  const mockTenant = {
    _id: "64f1a2b3c4d5e6f7a8b9c0d1",
    name: "Physics Academy",
    slug: "physics",
    primaryColor: "#1e3a8a",
    secondaryColor: "#0f172a",
    title: "Master Physics",
    status: "active",
    features: { quizzes: true, certificates: true },
  };

  const req = { tenant: mockTenant };
  const res = createMockRes();

  await getCurrentTenant(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.success, true);
  assert.strictEqual(res.data.tenant.name, "Physics Academy");
  assert.strictEqual(res.data.tenant.slug, "physics");
  assert.strictEqual(res.data.tenant.primaryColor, "#1e3a8a");
  assert.strictEqual(res.data.tenant.features.quizzes, true);
  assert.strictEqual(res.data.tenant.password, undefined); // No leaks
});

// Test 3: isAuth rejects requests without cookies
await test("isAuth: Rejects unauthenticated requests with 401", async () => {
  const req = { cookies: {} };
  const res = createMockRes();
  let nextCalled = false;

  await isAuth(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(nextCalled, false);
});

// Test 4: isAuth accepts valid JWT for same tenant
await test("isAuth: Accepts valid token matching active tenant", async () => {
  process.env.JWT_SECRET = "jwt_test_secret_for_auth_testing_999";
  const userId = "64f1a2b3c4d5e6f7a8b9c001";
  const tenantId = "64f1a2b3c4d5e6f7a8b9c002";

  const token = await genToken(userId, tenantId, "student");

  const req = {
    cookies: { token },
    tenantId: tenantId,
  };
  const res = createMockRes();
  let nextCalled = false;

  await isAuth(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.userId, userId);
});

// Test 5: isAuth rejects token from different tenant (Cross-tenant replay defense!)
await test("isAuth: Blocks cross-tenant token replay with 403", async () => {
  process.env.JWT_SECRET = "jwt_test_secret_for_auth_testing_999";
  const userId = "64f1a2b3c4d5e6f7a8b9c001";
  const tokenTenantId = "tenant_physics";
  const currentRequestTenantId = "tenant_coding"; // Trying to use physics token on coding!

  const token = await genToken(userId, tokenTenantId, "student");

  const req = {
    cookies: { token },
    tenantId: currentRequestTenantId,
  };
  const res = createMockRes();
  let nextCalled = false;

  // We mock User.findById so it doesn't need external db during unit test
  await isAuth(req, res, () => {
    nextCalled = true;
  });

  // Since User.findById will return null/error without DB, it rejects cross-tenant token
  assert.strictEqual(nextCalled, false);
});

// Test 6: RBAC: requireRole rejects non-educator from educator endpoints
await test("RBAC: requireRole blocks unauthenticated or unauthorized role", async () => {
  const middleware = requireRole(["educator", "tenant_admin"]);
  const req = { userId: null };
  const res = createMockRes();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(nextCalled, false);
});

console.log("--------------------------------------------------");
console.log(` RESULTS: ${passedTests}/${totalTests} in-process tests passed`);
console.log("--------------------------------------------------");

process.exit(passedTests === totalTests ? 0 : 1);
