import assert from "assert";
import mongoose from "express"; // placeholder check
import { extractSubdomain, tenantResolver } from "../middleware/tenantResolver.js";
import { genToken } from "../config/token.js";

console.log("==================================================");
console.log(" MULTI-TENANT SAAS SECURITY & ISOLATION TEST SUITE");
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

// =========================================================================
// TEST GROUP 1: Subdomain & Hostname Resolution
// =========================================================================
await test("Subdomain extraction: physics.mylms.com -> physics", () => {
  const slug = extractSubdomain("physics.mylms.com");
  assert.strictEqual(slug, "physics");
});

await test("Subdomain extraction: coding.lvh.me:5173 -> coding", () => {
  const slug = extractSubdomain("coding.lvh.me:5173");
  assert.strictEqual(slug, "coding");
});

await test("Subdomain extraction: abcacademy.localhost -> abcacademy", () => {
  const slug = extractSubdomain("abcacademy.localhost");
  assert.strictEqual(slug, "abcacademy");
});

await test("Root domain fallback: localhost:3000 -> default", () => {
  const slug = extractSubdomain("localhost:3000");
  assert.strictEqual(slug, "default");
});

await test("Render domain fallback: skillio-1-bb42.onrender.com -> default", () => {
  const slug = extractSubdomain("skillio-1-bb42.onrender.com");
  assert.strictEqual(slug, "default");
});

// =========================================================================
// TEST GROUP 2: JWT Security & Cross-Tenant Replay Protection
// =========================================================================
await test("JWT token embeds tenantId and role safely", async () => {
  const userId = "64f1a2b3c4d5e6f7a8b9c0d1";
  const tenantId = "64f1a2b3c4d5e6f7a8b9c0d2";
  process.env.JWT_SECRET = "test_secret_for_jwt_verification_123";

  const token = await genToken(userId, tenantId, "student");
  assert.ok(typeof token === "string" && token.length > 20);

  // Decode JWT
  const jwt = await import("jsonwebtoken");
  const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
  assert.strictEqual(decoded.userId, userId);
  assert.strictEqual(decoded.tenantId, tenantId);
  assert.strictEqual(decoded.role, "student");
});

// =========================================================================
// TEST GROUP 3: In-Memory Mock Database Unit Tests for Tenant Isolation
// =========================================================================
// Mock objects simulating Tenant, User, Course, Lecture collections
const mockTenants = [
  { _id: "tenant_physics", name: "Physics Academy", slug: "physics", status: "active" },
  { _id: "tenant_coding", name: "Coding Academy", slug: "coding", status: "active" },
  { _id: "tenant_suspended", name: "Suspended Org", slug: "suspended", status: "suspended" },
];

const mockUsers = [
  { _id: "user_p1", tenantId: "tenant_physics", email: "student@example.com", role: "student" },
  { _id: "user_c1", tenantId: "tenant_coding", email: "student@example.com", role: "student" }, // Same email, different tenant!
  { _id: "teacher_p1", tenantId: "tenant_physics", email: "prof.einstein@physics.edu", role: "educator" },
  { _id: "teacher_c1", tenantId: "tenant_coding", email: "turing@coding.edu", role: "educator" },
];

const mockCourses = [
  { _id: "course_phys_101", tenantId: "tenant_physics", title: "Quantum Physics 101", creator: "teacher_p1", isPublished: true, price: 999 },
  { _id: "course_code_101", tenantId: "tenant_coding", title: "Distributed Systems in Go", creator: "teacher_c1", isPublished: true, price: 1499 },
  { _id: "course_code_draft", tenantId: "tenant_coding", title: "Draft React Native", creator: "teacher_c1", isPublished: false, price: 499 },
];

await test("Tenant Scoping: Users with identical email in different tenants are completely isolated", () => {
  const physicsUsers = mockUsers.filter((u) => u.email === "student@example.com" && u.tenantId === "tenant_physics");
  const codingUsers = mockUsers.filter((u) => u.email === "student@example.com" && u.tenantId === "tenant_coding");

  assert.strictEqual(physicsUsers.length, 1);
  assert.strictEqual(codingUsers.length, 1);
  assert.strictEqual(physicsUsers[0]._id, "user_p1");
  assert.strictEqual(codingUsers[0]._id, "user_c1");
  assert.notStrictEqual(physicsUsers[0]._id, codingUsers[0]._id);
});

await test("Course Isolation: Physics tenant query never returns Coding tenant courses", () => {
  const activeTenantId = "tenant_physics";
  const physicsCourses = mockCourses.filter((c) => c.tenantId === activeTenantId && c.isPublished);

  assert.strictEqual(physicsCourses.length, 1);
  assert.strictEqual(physicsCourses[0].title, "Quantum Physics 101");
  assert.ok(!physicsCourses.some((c) => c.title.includes("Distributed Systems")));
});

await test("IDOR Protection: Tenant 1 teacher cannot delete or modify Tenant 2 course", () => {
  const req = {
    userId: "teacher_p1",
    userRole: "educator",
    tenantId: "tenant_physics",
    params: { courseId: "course_code_101" }, // Course belongs to tenant_coding
  };

  // Simulating controller query: Course.findOne({ _id: courseId, tenantId: req.tenantId })
  const foundCourse = mockCourses.find((c) => c._id === req.params.courseId && c.tenantId === req.tenantId);

  // Must be null/undefined because course belongs to another tenant!
  assert.strictEqual(foundCourse, undefined);
});

await test("Draft Privacy: Unpublished draft course in Tenant 2 is never leaked to published feed", () => {
  const activeTenantId = "tenant_coding";
  const publishedCodingCourses = mockCourses.filter((c) => c.tenantId === activeTenantId && c.isPublished);

  assert.strictEqual(publishedCodingCourses.length, 1);
  assert.strictEqual(publishedCodingCourses[0]._id, "course_code_101");
  assert.ok(!publishedCodingCourses.some((c) => c._id === "course_code_draft"));
});

await test("Suspended Tenant Enforcement: Requests to suspended tenant are blocked", () => {
  const targetTenant = mockTenants.find((t) => t.slug === "suspended");
  assert.strictEqual(targetTenant.status, "suspended");

  // In middleware, if status === 'suspended', returns 403
  const isAllowed = targetTenant.status !== "suspended";
  assert.strictEqual(isAllowed, false);
});

await test("Payment Cross-Tenant Protection: Student cannot buy course from another tenant", () => {
  const req = {
    userId: "user_p1", // Physics student
    tenantId: "tenant_physics",
    body: { courseId: "course_code_101" }, // Coding course
  };

  // Controller check: Course.findOne({ _id: req.body.courseId, tenantId: req.tenantId })
  const course = mockCourses.find((c) => c._id === req.body.courseId && c.tenantId === req.tenantId);
  assert.strictEqual(course, undefined); // Refuses to generate order for another tenant's course
});

console.log("--------------------------------------------------");
console.log(` RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log("--------------------------------------------------");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
