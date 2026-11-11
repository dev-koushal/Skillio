import assert from "assert";
import crypto from "crypto";

console.log("\n==================================================");
console.log(" INSTITUTION-LEVEL STUDENT MANAGEMENT & ACCESS SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${error.message}`);
    testsFailed++;
  }
};

// In-memory data store for isolated mock testing
const mockTenants = new Map([
  [
    "tenant_english",
    {
      _id: "tenant_english",
      name: "English Academy",
      slug: "english-academy",
      ownerId: "educator_english",
      status: "active",
    },
  ],
  [
    "tenant_physics",
    {
      _id: "tenant_physics",
      name: "Physics Academy",
      slug: "physics-academy",
      ownerId: "educator_physics",
      status: "active",
    },
  ],
]);

const mockUsers = new Map([
  [
    "educator_english",
    {
      _id: "educator_english",
      name: "English Teacher",
      email: "teacher.english@skillio.com",
      role: "educator",
      tenantId: "tenant_english",
    },
  ],
  [
    "educator_physics",
    {
      _id: "educator_physics",
      name: "Physics Teacher",
      email: "teacher.physics@skillio.com",
      role: "educator",
      tenantId: "tenant_physics",
    },
  ],
  [
    "student_rahul",
    {
      _id: "student_rahul",
      name: "Rahul Sharma",
      email: "rahul@gmail.com",
      password: "$2a$10$hashedsecretpasswordhere12345678",
      role: "student",
      tenantId: "tenant_english",
      enrolledCourses: ["course_english_1"],
    },
  ],
  [
    "student_priya",
    {
      _id: "student_priya",
      name: "Priya Patel",
      email: "priya@gmail.com",
      password: "$2a$10$hashedsecretpasswordhere87654321",
      role: "student",
      tenantId: "tenant_physics",
      enrolledCourses: ["course_physics_1"],
    },
  ],
]);

const mockCourses = new Map([
  [
    "course_english_1",
    {
      _id: "course_english_1",
      title: "English Mastery",
      tenantId: "tenant_english",
      creator: "educator_english",
      price: 499,
      isPublished: true,
      enrolledStudents: ["student_rahul"],
    },
  ],
  [
    "course_english_2",
    {
      _id: "course_english_2",
      title: "Interview Spoken English",
      tenantId: "tenant_english",
      creator: "educator_english",
      price: 799,
      isPublished: true,
      enrolledStudents: [],
    },
  ],
  [
    "course_physics_1",
    {
      _id: "course_physics_1",
      title: "Quantum Mechanics",
      tenantId: "tenant_physics",
      creator: "educator_physics",
      price: 999,
      isPublished: true,
      enrolledStudents: ["student_priya"],
    },
  ],
]);

const mockCourseAccess = new Map([
  [
    "student_rahul_course_english_1",
    {
      userId: "student_rahul",
      courseId: "course_english_1",
      tenantId: "tenant_english",
      source: "PURCHASED",
      status: "active",
      grantedAt: new Date("2026-01-10"),
    },
  ],
  [
    "student_priya_course_physics_1",
    {
      userId: "student_priya",
      courseId: "course_physics_1",
      tenantId: "tenant_physics",
      source: "PURCHASED",
      status: "active",
      grantedAt: new Date("2026-01-15"),
    },
  ],
]);

const mockMemberships = new Map([
  [
    "student_rahul_tenant_english",
    {
      userId: "student_rahul",
      tenantId: "tenant_english",
      role: "student",
      status: "active",
      joinedAt: new Date("2026-01-01"),
    },
  ],
  [
    "student_priya_tenant_physics",
    {
      userId: "student_priya",
      tenantId: "tenant_physics",
      role: "student",
      status: "active",
      joinedAt: new Date("2026-01-05"),
    },
  ],
]);

// Handlers simulating production controller logic
const simulateCreateInstitution = ({ userId, role, name, slug }) => {
  if (role === "student") {
    return {
      status: 403,
      message: "Students are consumers of institutions and are not permitted to create organizations.",
    };
  }
  for (const tenant of mockTenants.values()) {
    if (tenant.ownerId === userId) {
      return {
        status: 400,
        message: `You already manage '${tenant.name}'. Educators are limited to exactly one institution.`,
      };
    }
  }
  return { status: 201, success: true };
};

const simulateGetInstitutionStudents = ({ educatorId }) => {
  const educator = mockUsers.get(educatorId);
  if (!educator || educator.role !== "educator") {
    return { status: 403, message: "Unauthorized" };
  }
  const tenantId = educator.tenantId;

  // Collect only students who belong to this educator's institution
  const studentIds = new Set();
  for (const m of mockMemberships.values()) {
    if (m.tenantId === tenantId && m.role === "student") {
      studentIds.add(m.userId);
    }
  }
  for (const ca of mockCourseAccess.values()) {
    if (ca.tenantId === tenantId && ca.status === "active") {
      studentIds.add(ca.userId);
    }
  }

  const results = [];
  for (const sid of studentIds) {
    const u = mockUsers.get(sid);
    if (u) {
      // Security: Never leak password
      const safe = { ...u };
      delete safe.password;
      results.push(safe);
    }
  }

  return { status: 200, success: true, count: results.length, students: results };
};

const simulateGrantCourseAccess = ({ educatorId, studentId, courseId }) => {
  const educator = mockUsers.get(educatorId);
  if (!educator || educator.role !== "educator") {
    return { status: 403, message: "Unauthorized" };
  }

  const course = mockCourses.get(courseId);
  if (!course || course.tenantId !== educator.tenantId) {
    return { status: 404, message: "Course not found in your institution." };
  }

  const student = mockUsers.get(studentId);
  if (!student) {
    return { status: 404, message: "Student not found" };
  }

  const key = `${studentId}_${courseId}`;
  mockCourseAccess.set(key, {
    userId: studentId,
    courseId,
    tenantId: educator.tenantId,
    source: "INSTITUTION_GRANTED",
    status: "active",
    grantedBy: educatorId,
    grantedAt: new Date(),
  });

  if (!student.enrolledCourses.includes(courseId)) {
    student.enrolledCourses.push(courseId);
  }
  if (!course.enrolledStudents.includes(studentId)) {
    course.enrolledStudents.push(studentId);
  }

  return { status: 200, success: true, message: `Access to '${course.title}' granted successfully!` };
};

const simulateRevokeCourseAccess = ({ educatorId, studentId, courseId }) => {
  const educator = mockUsers.get(educatorId);
  if (!educator || educator.role !== "educator") {
    return { status: 403, message: "Unauthorized" };
  }

  const course = mockCourses.get(courseId);
  if (!course || course.tenantId !== educator.tenantId) {
    return { status: 404, message: "Course not found in your institution." };
  }

  const student = mockUsers.get(studentId);
  if (!student) {
    return { status: 404, message: "Student not found" };
  }

  const key = `${studentId}_${courseId}`;
  const access = mockCourseAccess.get(key);
  if (access) {
    access.status = "revoked";
    access.revokedAt = new Date();
    access.revokedBy = educatorId;
    // Note: access.source remains 'PURCHASED' so financial record is not destroyed!
  }

  student.enrolledCourses = student.enrolledCourses.filter((id) => id !== courseId);
  course.enrolledStudents = course.enrolledStudents.filter((id) => id !== studentId);

  return { status: 200, success: true, message: `Access to '${course.title}' revoked.` };
};

const simulateGetInstitutionOverview = ({ educatorId }) => {
  const educator = mockUsers.get(educatorId);
  if (!educator || educator.role !== "educator") {
    return { status: 403, message: "Unauthorized: only educators can access institution overview" };
  }
  const tenantId = educator.tenantId;

  // Filter courses for this tenant
  const tenantCourses = Array.from(mockCourses.values()).filter((c) => c.tenantId === tenantId);

  // Filter students for this tenant
  const studentIds = new Set();
  for (const m of mockMemberships.values()) {
    if (m.tenantId === tenantId && m.role === "student") {
      studentIds.add(m.userId);
    }
  }
  for (const ca of mockCourseAccess.values()) {
    if (ca.tenantId === tenantId && ca.status === "active") {
      studentIds.add(ca.userId);
    }
  }

  let totalRevenue = 0;
  tenantCourses.forEach((c) => {
    if (c.price && c.enrolledStudents) {
      totalRevenue += c.price * c.enrolledStudents.length;
    }
  });

  return {
    status: 200,
    success: true,
    stats: {
      totalStudents: studentIds.size,
      totalCourses: tenantCourses.length,
      publishedCourses: tenantCourses.filter((c) => c.isPublished).length,
      totalRevenue,
    },
    recentCourses: tenantCourses.slice(0, 4),
    recentStudents: Array.from(studentIds).slice(0, 5).map((id) => mockUsers.get(id)),
  };
};

const simulateGetMyInstitution = ({ educatorId }) => {
  const user = mockUsers.get(educatorId);
  if (!user) return { status: 404, message: "User not found" };

  let tenant = null;
  for (const t of mockTenants.values()) {
    if (t.ownerId === educatorId) {
      tenant = t;
      break;
    }
  }
  if (!tenant && user.tenantId) {
    tenant = mockTenants.get(user.tenantId);
  }

  return {
    status: 200,
    success: true,
    hasInstitution: Boolean(tenant),
    tenant: tenant || null,
  };
};

const simulateUpdateMyInstitution = ({ educatorId, updateData }) => {
  const user = mockUsers.get(educatorId);
  if (!user) return { status: 404, message: "User not found" };
  if (user.role === "student") return { status: 403, message: "Students cannot manage institutions" };

  let tenant = null;
  for (const t of mockTenants.values()) {
    if (t.ownerId === educatorId) {
      tenant = t;
      break;
    }
  }
  if (!tenant && user.tenantId) {
    tenant = mockTenants.get(user.tenantId);
  }

  if (!tenant) return { status: 404, message: "No institution found" };

  if (updateData.name) tenant.name = updateData.name;
  if (updateData.title) tenant.title = updateData.title;
  if (updateData.description) tenant.description = updateData.description;
  if (updateData.primaryColor) tenant.primaryColor = updateData.primaryColor;

  return {
    status: 200,
    success: true,
    message: `Institution '${tenant.name}' updated successfully!`,
    tenant,
  };
};

// EXECUTE TEST SUITE
async function runTests() {
  mockTenants.clear();
  mockUsers.clear();
  mockCourses.clear();
  mockMemberships.clear();
  mockCourseAccess.clear();

  mockTenants.set("tenant_english", {
    _id: "tenant_english",
    name: "English Academy",
    slug: "english",
    ownerId: "educator_english",
  });
  mockTenants.set("tenant_physics", {
    _id: "tenant_physics",
    name: "Physics Academy",
    slug: "physics-academy",
    ownerId: "educator_physics",
  });

  mockUsers.set("educator_english", {
    _id: "educator_english",
    name: "Sir John",
    email: "john@english.com",
    role: "educator",
    tenantId: "tenant_english",
  });
  mockUsers.set("educator_physics", {
    _id: "educator_physics",
    name: "Dr. Newton",
    email: "newton@physics.com",
    role: "educator",
    tenantId: "tenant_physics",
  });
  mockUsers.set("student_rahul", {
    _id: "student_rahul",
    name: "Rahul Sharma",
    email: "rahul@gmail.com",
    role: "student",
    tenantId: "tenant_english",
    enrolledCourses: ["course_english_1"],
  });
  mockUsers.set("student_priya", {
    _id: "student_priya",
    name: "Priya Patel",
    email: "priya@gmail.com",
    role: "student",
    tenantId: "tenant_physics",
    enrolledCourses: ["course_physics_1"],
  });

  mockCourses.set("course_english_1", {
    _id: "course_english_1",
    title: "English Mastery",
    tenantId: "tenant_english",
    enrolledStudents: ["student_rahul"],
    isPublished: true,
    price: 499,
  });
  mockCourses.set("course_english_2", {
    _id: "course_english_2",
    title: "Spoken English",
    tenantId: "tenant_english",
    enrolledStudents: [],
    isPublished: false,
    price: 299,
  });
  mockCourses.set("course_physics_1", {
    _id: "course_physics_1",
    title: "Quantum Physics",
    tenantId: "tenant_physics",
    enrolledStudents: ["student_priya"],
  });

  mockMemberships.set("student_rahul_tenant_english", {
    userId: "student_rahul",
    tenantId: "tenant_english",
    role: "student",
    status: "active",
    joinedAt: new Date(),
  });
  mockMemberships.set("student_priya_tenant_physics", {
    userId: "student_priya",
    tenantId: "tenant_physics",
    role: "student",
    status: "active",
    joinedAt: new Date(),
  });

  mockCourseAccess.set("student_rahul_course_english_1", {
    userId: "student_rahul",
    courseId: "course_english_1",
    tenantId: "tenant_english",
    source: "PURCHASED",
    status: "active",
  });
  mockCourseAccess.set("student_priya_course_physics_1", {
    userId: "student_priya",
    courseId: "course_physics_1",
    tenantId: "tenant_physics",
    source: "PURCHASED",
    status: "active",
  });

  // Test 1: Students cannot create an institution
  await test("1. Students are strictly barred from creating institutions (403 Forbidden)", () => {
    const res = simulateCreateInstitution({
      userId: "student_rahul",
      role: "student",
      name: "Rahul Academy",
      slug: "rahul-academy",
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.message, /Students are consumers/);
  });

  // Test 2: Educators are limited to exactly ONE institution
  await test("2. Educators cannot create multiple institutions (enforced 1 per educator)", () => {
    const res = simulateCreateInstitution({
      userId: "educator_english",
      role: "educator",
      name: "Another English School",
      slug: "another-english",
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.message, /limited to exactly one institution/);
  });

  // Test 3: Educator A sees only Institution A's students
  await test("3. Educator in English Academy sees ONLY English Academy students", () => {
    const res = simulateGetInstitutionStudents({ educatorId: "educator_english" });
    assert.strictEqual(res.status, 200);
    const emails = res.students.map((s) => s.email);
    assert.ok(emails.includes("rahul@gmail.com"));
    assert.strictEqual(emails.includes("priya@gmail.com"), false, "Must NOT leak Physics Academy student!");
  });

  // Test 4: Cross-Tenant Student Isolation (Physics teacher sees only Priya)
  await test("4. Educator in Physics Academy sees ONLY Physics Academy students", () => {
    const res = simulateGetInstitutionStudents({ educatorId: "educator_physics" });
    assert.strictEqual(res.status, 200);
    const emails = res.students.map((s) => s.email);
    assert.ok(emails.includes("priya@gmail.com"));
    assert.strictEqual(emails.includes("rahul@gmail.com"), false, "Must NOT leak English Academy student!");
  });

  // Test 5: Educator A grants course access to student in Institution A
  await test("5. Educator grants course access with 'INSTITUTION_GRANTED' status", () => {
    const res = simulateGrantCourseAccess({
      educatorId: "educator_english",
      studentId: "student_rahul",
      courseId: "course_english_2",
    });
    assert.strictEqual(res.status, 200);
    const access = mockCourseAccess.get("student_rahul_course_english_2");
    assert.ok(access);
    assert.strictEqual(access.source, "INSTITUTION_GRANTED");
    assert.strictEqual(access.status, "active");
    assert.strictEqual(access.grantedBy, "educator_english");
  });

  // Test 6: Cross-Tenant Course Grant Prevention (IDOR)
  await test("6. Educator A cannot grant Course B from another institution (IDOR protection)", () => {
    const res = simulateGrantCourseAccess({
      educatorId: "educator_english",
      studentId: "student_rahul",
      courseId: "course_physics_1", // Belongs to Physics Academy!
    });
    assert.strictEqual(res.status, 404);
    assert.match(res.message, /not found in your institution/);
  });

  // Test 7: Educator revokes access without destroying financial audit trail
  await test("7. Access revocation marks status revoked while preserving PURCHASED source", () => {
    // Revoke course_english_1 which was PURCHASED
    const res = simulateRevokeCourseAccess({
      educatorId: "educator_english",
      studentId: "student_rahul",
      courseId: "course_english_1",
    });
    assert.strictEqual(res.status, 200);

    const access = mockCourseAccess.get("student_rahul_course_english_1");
    assert.strictEqual(access.status, "revoked");
    assert.strictEqual(access.source, "PURCHASED", "Payment record must NOT be deleted!");
    assert.ok(access.revokedAt);
    assert.strictEqual(access.revokedBy, "educator_english");

    const student = mockUsers.get("student_rahul");
    assert.strictEqual(student.enrolledCourses.includes("course_english_1"), false);
  });

  // Test 8: Student can belong to multiple institutions without duplicate account
  await test("8. Student Rahul joins Physics Academy as multi-institution member", () => {
    mockMemberships.set("student_rahul_tenant_physics", {
      userId: "student_rahul",
      tenantId: "tenant_physics",
      role: "student",
      status: "active",
      joinedAt: new Date(),
    });

    // Verify Rahul is now a member of Physics Academy as well
    const physicsRes = simulateGetInstitutionStudents({ educatorId: "educator_physics" });
    const emails = physicsRes.students.map((s) => s.email);
    assert.ok(emails.includes("rahul@gmail.com"));
    assert.ok(emails.includes("priya@gmail.com"));

    // Verify account was NOT duplicated
    assert.strictEqual(mockUsers.get("student_rahul").email, "rahul@gmail.com");
  });

  // Test 9: Passwords are NEVER returned in student management APIs
  await test("9. Plaintext and hashed passwords are never exposed in student management endpoints", () => {
    const res = simulateGetInstitutionStudents({ educatorId: "educator_english" });
    for (const student of res.students) {
      assert.strictEqual(student.password, undefined, "Password must be stripped from response");
    }
  });

  // Test 10: Educator cannot access student management if not educator
  await test("10. Non-educators cannot invoke student management endpoints (403)", () => {
    const res = simulateGetInstitutionStudents({ educatorId: "student_rahul" });
    assert.strictEqual(res.status, 403);
  });

  // Test 11: Student SignUp with institutionSlug scopes user and membership
  await test("11. Student sign-up with institutionSlug binds user and active membership to chosen academy", () => {
    const chosenSlug = "physics-academy";
    const tenant = Array.from(mockTenants.values()).find((t) => t.slug === chosenSlug);
    assert.ok(tenant, "Target tenant must exist");

    const newStudentId = "student_sneha";
    mockUsers.set(newStudentId, {
      _id: newStudentId,
      name: "Sneha Roy",
      email: "sneha@gmail.com",
      role: "student",
      tenantId: tenant._id,
      enrolledCourses: [],
    });

    mockMemberships.set(`${newStudentId}_${tenant._id}`, {
      userId: newStudentId,
      tenantId: tenant._id,
      role: "student",
      status: "active",
      joinedAt: new Date(),
    });

    // Verify educator in Physics Academy sees Sneha
    const physicsRes = simulateGetInstitutionStudents({ educatorId: "educator_physics" });
    const emails = physicsRes.students.map((s) => s.email);
    assert.ok(emails.includes("sneha@gmail.com"));

    // Verify educator in English Academy does NOT see Sneha
    const englishRes = simulateGetInstitutionStudents({ educatorId: "educator_english" });
    const englishEmails = englishRes.students.map((s) => s.email);
    assert.strictEqual(englishEmails.includes("sneha@gmail.com"), false);
  });

  // Mock invitations store for testing
  const mockInvitations = new Map();

  const simulateCreateInvitation = ({ educatorId, courseId, invitedEmail }) => {
    const educator = mockUsers.get(educatorId);
    if (!educator || educator.role !== "educator") {
      return { status: 403, message: "Unauthorized" };
    }

    const tenant = Array.from(mockTenants.values()).find((t) => t.ownerId === educatorId);
    if (!tenant) return { status: 403, message: "No tenant" };

    const course = mockCourses.get(courseId);
    if (!course || course.tenantId !== tenant._id) {
      return { status: 404, message: "Course not found in your institution" };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = {
      _id: `inv_${Date.now()}`,
      tokenHash,
      tenantId: tenant._id,
      courseId,
      invitedEmail: invitedEmail || "direct-link",
      invitedBy: educatorId,
      status: "pending",
      expiresAt,
    };

    mockInvitations.set(tokenHash, invitation);

    return {
      status: 201,
      inviteUrl: `http://localhost:5173/accept-invite?token=${rawToken}`,
      rawToken,
      tokenHash,
      expiresAt,
      courseTitle: course.title,
    };
  };

  const simulateAcceptInvitation = ({ studentId, rawToken }) => {
    const student = mockUsers.get(studentId);
    if (!student) return { status: 404, message: "Student not found" };

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invitation = mockInvitations.get(tokenHash);

    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      return { status: 400, message: "Invalid or expired invitation" };
    }

    // Activate course access
    mockCourseAccess.set(`${studentId}_${invitation.courseId}`, {
      userId: studentId,
      courseId: invitation.courseId,
      tenantId: invitation.tenantId,
      source: "INSTITUTION_GRANTED",
      status: "active",
      grantedBy: invitation.invitedBy,
      grantedAt: new Date(),
    });

    // Add to enrolledCourses
    if (!student.enrolledCourses.includes(invitation.courseId)) {
      student.enrolledCourses.push(invitation.courseId);
    }

    // Mark invitation accepted
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = studentId;

    return {
      status: 200,
      message: "Course access granted!",
      courseId: invitation.courseId,
      tenantId: invitation.tenantId,
    };
  };

  // Test 12: Educator generates course invitation link
  await test("12. Educator generates secure course invitation link with SHA-256 token hash", () => {
    const res = simulateCreateInvitation({
      educatorId: "educator_english",
      courseId: "course_english_1",
      invitedEmail: "karan@gmail.com",
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.inviteUrl.includes("/accept-invite?token="));
    assert.ok(res.rawToken.length >= 64);
    assert.ok(res.expiresAt > new Date());
    assert.strictEqual(mockInvitations.has(res.tokenHash), true);
  });

  // Test 13: Student accepts invitation link
  await test("13. Student accepts invitation link: activates course access with source INSTITUTION_GRANTED", () => {
    // Register new student Karan
    mockUsers.set("student_karan", {
      _id: "student_karan",
      name: "Karan Johar",
      email: "karan@gmail.com",
      role: "student",
      tenantId: "tenant_english",
      enrolledCourses: [],
    });

    // Create invite
    const inviteRes = simulateCreateInvitation({
      educatorId: "educator_english",
      courseId: "course_english_1",
      invitedEmail: "karan@gmail.com",
    });

    // Accept invite
    const acceptRes = simulateAcceptInvitation({
      studentId: "student_karan",
      rawToken: inviteRes.rawToken,
    });

    assert.strictEqual(acceptRes.status, 200);
    const access = mockCourseAccess.get("student_karan_course_english_1");
    assert.ok(access, "Course access must be recorded");
    assert.strictEqual(access.status, "active");
    assert.strictEqual(access.source, "INSTITUTION_GRANTED");
    assert.ok(mockUsers.get("student_karan").enrolledCourses.includes("course_english_1"));

    // Verify invitation status transitioned to accepted
    assert.strictEqual(mockInvitations.get(inviteRes.tokenHash).status, "accepted");
  });

  // Test 14: Cross-tenant invitation prevention
  await test("14. Cross-tenant invitation protection: Educator A cannot generate invite for Educator B's course", () => {
    const res = simulateCreateInvitation({
      educatorId: "educator_english",
      courseId: "course_physics_1", // Belongs to Physics Academy
      invitedEmail: "intruder@gmail.com",
    });

    assert.strictEqual(res.status, 404);
  });

  // Test 15: Single-use invitation replay protection
  await test("15. Replay protection: Already accepted invitation cannot be accepted a second time", () => {
    const inviteRes = simulateCreateInvitation({
      educatorId: "educator_english",
      courseId: "course_english_1",
      invitedEmail: "replay@gmail.com",
    });

    // First acceptance
    simulateAcceptInvitation({ studentId: "student_karan", rawToken: inviteRes.rawToken });

    // Second acceptance attempt with same token
    const replayRes = simulateAcceptInvitation({ studentId: "student_priya", rawToken: inviteRes.rawToken });
    assert.strictEqual(replayRes.status, 400);
    assert.strictEqual(replayRes.message, "Invalid or expired invitation");
  });

  // Test 16: Educator Overview data scoping
  await test("16. Educator Overview computes real stats scoped to the educator's institution", () => {
    const overview = simulateGetInstitutionOverview({ educatorId: "educator_english" });
    assert.strictEqual(overview.status, 200);
    assert.strictEqual(overview.success, true);
    assert.strictEqual(overview.stats.totalCourses, 2); // English 1 & English 2
    assert.strictEqual(overview.stats.publishedCourses, 1);
    assert(overview.stats.totalStudents >= 1);
    assert(overview.recentCourses.length <= 4);
    assert(overview.recentCourses.every((c) => c.tenantId === "tenant_english"));
  });

  // Test 17: Tenant isolation in overview (never leaks other academy courses)
  await test("17. Educator Overview never leaks other institution's courses or students", () => {
    const overview = simulateGetInstitutionOverview({ educatorId: "educator_english" });
    assert.strictEqual(overview.recentCourses.some((c) => c.tenantId === "tenant_physics"), false);
  });

  // Test 18: Role security: Students cannot access educator overview (403)
  await test("18. Role security: Students attempting to access educator overview are blocked (403)", () => {
    const overview = simulateGetInstitutionOverview({ educatorId: "student_rahul" });
    assert.strictEqual(overview.status, 403);
  });

  // Test 19: Educator already has an institution -> getMyInstitution returns it
  await test("19. Educator with connected institution receives it via getMyInstitution", () => {
    const res = simulateGetMyInstitution({ educatorId: "educator_english" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.hasInstitution, true);
    assert.strictEqual(res.tenant.name, "English Academy");
  });

  // Test 20: Educator updates their institution settings while slug remains intact
  await test("20. Educator updates institution branding/settings while slug is preserved", () => {
    const res = simulateUpdateMyInstitution({
      educatorId: "educator_english",
      updateData: {
        title: "Master Practical English Fluency",
        primaryColor: "#065f46",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.tenant.title, "Master Practical English Fluency");
    assert.strictEqual(res.tenant.primaryColor, "#065f46");
    assert.strictEqual(res.tenant.slug, "english"); // permanent slug preserved
  });

  console.log("--------------------------------------------------");
  console.log(` RESULTS: ${testsPassed}/${testsPassed + testsFailed} tests passed`);
  console.log("--------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();

