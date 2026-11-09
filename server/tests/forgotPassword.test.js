import assert from "assert";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Mock User in-memory collection
const mockUsers = [];
let mockUserIdCounter = 1;

class MockUser {
  constructor(data) {
    this._id = data._id || `user_${mockUserIdCounter++}`;
    this.name = data.name || "Test User";
    this.email = data.email?.toLowerCase().trim();
    this.password = data.password;
    this.role = data.role || "student";
    this.tenantId = data.tenantId || "tenant_default";
    this.resetOtp = data.resetOtp;
    this.otpExpires = data.otpExpires;
    this.otpAttempts = data.otpAttempts || 0;
    this.isOtpVerified = data.isOtpVerified || false;
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires;
  }

  async save() {
    const existingIndex = mockUsers.findIndex((u) => u._id === this._id);
    if (existingIndex >= 0) {
      mockUsers[existingIndex] = this;
    } else {
      mockUsers.push(this);
    }
    return this;
  }

  static async findOne(query) {
    const match = mockUsers.find((u) => {
      let ok = true;
      if (query.email && u.email !== query.email.toLowerCase().trim()) ok = false;
      if (query.tenantId && u.tenantId !== query.tenantId) ok = false;
      return ok;
    });

    if (!match) return null;

    // Return a MockUser instance with select simulation
    const instance = new MockUser(match);
    instance.select = () => instance;
    return instance;
  }
}

// Emulated controllers for unit testing logic
const sendOtpHandler = async (req) => {
  let { email } = req.body || {};
  const tenantId = req.tenantId;

  if (!email) {
    return { status: 400, data: { success: false, message: "Please enter your registered email address" } };
  }

  email = email.trim().toLowerCase();

  let user = null;
  if (tenantId) {
    user = await MockUser.findOne({ email, tenantId });
  }
  if (!user) {
    user = await MockUser.findOne({ email });
  }

  if (!user) {
    return {
      status: 200,
      data: { success: true, message: "If an account with that email exists, a verification code has been sent." },
    };
  }

  // 60-second cooldown check
  if (user.otpExpires) {
    const msRemaining = new Date(user.otpExpires).getTime() - Date.now();
    if (msRemaining > 9 * 60 * 1000) {
      const waitSeconds = Math.ceil((msRemaining - 9 * 60 * 1000) / 1000);
      return {
        status: 429,
        data: { success: false, message: `Please wait ${waitSeconds} seconds before requesting another verification code.` },
      };
    }
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  user.resetOtp = hashedOtp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.isOtpVerified = false;
  user.otpAttempts = 0;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return {
    status: 200,
    data: {
      success: true,
      message: "Verification code sent to your email!",
      devOtp: otp, // For test verification
    },
  };
};

const verifyOtpHandler = async (req) => {
  let { email, otp } = req.body || {};
  const tenantId = req.tenantId;

  if (!email || !otp) {
    return { status: 400, data: { success: false, message: "Email and verification code are required" } };
  }

  email = email.trim().toLowerCase();
  const cleanOtp = otp.toString().trim();

  let user = null;
  if (tenantId) {
    user = await MockUser.findOne({ email, tenantId });
  }
  if (!user) {
    user = await MockUser.findOne({ email });
  }

  if (!user || !user.resetOtp || !user.otpExpires) {
    return { status: 400, data: { success: false, message: "Invalid or expired verification code." } };
  }

  if (Date.now() >= new Date(user.otpExpires).getTime()) {
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();
    return { status: 400, data: { success: false, message: "Verification code has expired. Please request a new one." } };
  }

  if ((user.otpAttempts || 0) >= 5) {
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();
    return {
      status: 429,
      data: { success: false, message: "Too many incorrect attempts. This code has been invalidated." },
    };
  }

  const suppliedHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
  const storedHash = user.resetOtp.length === 64
    ? user.resetOtp
    : crypto.createHash("sha256").update(user.resetOtp).digest("hex");

  const isMatch = crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(storedHash));

  if (!isMatch) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    const remaining = 5 - user.otpAttempts;
    return {
      status: 400,
      data: { success: false, message: `Incorrect code. ${remaining} attempts remaining.` },
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.isOtpVerified = true;
  user.resetOtp = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.resetPasswordToken = hashedResetToken;
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

  await user.save();

  return {
    status: 200,
    data: {
      success: true,
      message: "Verification code confirmed successfully!",
      resetToken,
    },
  };
};

const resetPasswordHandler = async (req) => {
  let { email, password, newPassword, resetToken } = req.body || {};
  const tenantId = req.tenantId;

  const finalPassword = newPassword || password;

  if (!email) {
    return { status: 400, data: { success: false, message: "Email is required" } };
  }

  if (!finalPassword) {
    return { status: 400, data: { success: false, message: "New password is required" } };
  }

  if (finalPassword.length < 8) {
    return { status: 400, data: { success: false, message: "Password must be at least 8 characters long" } };
  }

  email = email.trim().toLowerCase();

  let user = null;
  if (tenantId) {
    user = await MockUser.findOne({ email, tenantId });
  }
  if (!user) {
    user = await MockUser.findOne({ email });
  }

  if (!user) {
    return { status: 400, data: { success: false, message: "User account not found" } };
  }

  let isAuthorized = false;

  if (resetToken && user.resetPasswordToken && user.resetPasswordExpires) {
    if (Date.now() < new Date(user.resetPasswordExpires).getTime()) {
      const hashedSuppliedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      if (hashedSuppliedToken === user.resetPasswordToken) {
        isAuthorized = true;
      }
    }
  } else if (user.isOtpVerified) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return {
      status: 400,
      data: { success: false, message: "Password reset session has expired or is invalid." },
    };
  }

  const hashedPassword = await bcrypt.hash(finalPassword, 10);
  user.password = hashedPassword;

  user.isOtpVerified = false;
  user.resetOtp = undefined;
  user.otpExpires = undefined;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.otpAttempts = 0;

  await user.save();

  return {
    status: 200,
    data: { success: true, message: "Password reset successful! You can now sign in." },
  };
};

// ==========================================
// TEST RUNNER
// ==========================================
async function runTests() {
  console.log("==================================================");
  console.log(" FORGOT PASSWORD & SECURITY VERIFICATION SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  };

  // Seed test user
  const initialHash = await bcrypt.hash("OldPassword123!", 10);
  const testUser = new MockUser({
    email: "student@example.com",
    password: initialHash,
    tenantId: "tenant_physics",
    name: "Marie Curie",
  });
  await testUser.save();

  // Test 1: Send OTP generates 6-digit code and returns success
  let generatedOtp = null;
  await test("1. Send OTP generates 6-digit code and sets 10-minute expiry", async () => {
    const res = await sendOtpHandler({
      body: { email: "student@example.com" },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(typeof res.data.devOtp, "string");
    assert.strictEqual(res.data.devOtp.length, 6);
    generatedOtp = res.data.devOtp;

    // Check DB record
    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    assert.ok(userInDb.resetOtp);
    // Verified that stored OTP is a 64-char SHA-256 hash (never plain text!)
    assert.strictEqual(userInDb.resetOtp.length, 64);
    assert.notStrictEqual(userInDb.resetOtp, generatedOtp);
    assert.ok(userInDb.otpExpires > new Date());
  });

  // Test 2: Rate limiting prevents spamming sendOtp within 60 seconds
  await test("2. Cooldown rate limiter blocks immediate duplicate sendOtp requests (429)", async () => {
    const res = await sendOtpHandler({
      body: { email: "student@example.com" },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Please wait/);
  });

  // Test 3: Anti-enumeration for non-existent emails
  await test("3. Anti-enumeration returns neutral success for non-existent emails", async () => {
    const res = await sendOtpHandler({
      body: { email: "nonexistent_hacker@unknown.org" },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.match(res.data.message, /If an account with that email exists/);
  });

  // Test 4: Incorrect OTP fails verification and decrements attempt count
  await test("4. Incorrect verification code is rejected and decrements attempts", async () => {
    const res = await verifyOtpHandler({
      body: { email: "student@example.com", otp: "000000" },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /4 attempts remaining/);

    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    assert.strictEqual(userInDb.otpAttempts, 1);
  });

  // Test 5: Brute force lock out after 5 failed attempts
  await test("5. Brute-force protection locks and clears OTP after 5 failed attempts", async () => {
    for (let i = 2; i <= 5; i++) {
      await verifyOtpHandler({
        body: { email: "student@example.com", otp: `00000${i}` },
        tenantId: "tenant_physics",
      });
    }

    // 6th attempt should return 429 and clear OTP from database
    const res = await verifyOtpHandler({
      body: { email: "student@example.com", otp: "000006" },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 429);
    assert.match(res.data.message, /Too many incorrect attempts/);

    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    assert.strictEqual(userInDb.resetOtp, undefined);
  });

  // Test 6: Re-request OTP after lock and verify successfully
  let activeResetToken = null;
  await test("6. Re-requesting OTP and submitting correct code returns secure resetToken", async () => {
    // Clear cooldown for test simulation
    const u = await MockUser.findOne({ email: "student@example.com" });
    u.otpExpires = new Date(Date.now() - 1000);
    await u.save();

    const sendRes = await sendOtpHandler({
      body: { email: "student@example.com" },
      tenantId: "tenant_physics",
    });
    const freshOtp = sendRes.data.devOtp;

    const verifyRes = await verifyOtpHandler({
      body: { email: "student@example.com", otp: freshOtp },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    assert.ok(verifyRes.data.resetToken);
    assert.strictEqual(verifyRes.data.resetToken.length, 64);
    activeResetToken = verifyRes.data.resetToken;

    // Verify OTP was cleared and resetToken hash was stored
    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    assert.strictEqual(userInDb.resetOtp, undefined);
    assert.ok(userInDb.resetPasswordToken);
    assert.strictEqual(userInDb.resetPasswordToken.length, 64);
  });

  // Test 7: Password length check (must be at least 8 characters)
  await test("7. resetPassword rejects passwords under 8 characters", async () => {
    const res = await resetPasswordHandler({
      body: {
        email: "student@example.com",
        newPassword: "short",
        resetToken: activeResetToken,
      },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /at least 8 characters/);
  });

  // Test 8: Password reset succeeds with newPassword and resetToken
  await test("8. resetPassword updates password hash and wipes resetToken", async () => {
    const res = await resetPasswordHandler({
      body: {
        email: "student@example.com",
        newPassword: "BrandNewSecurePassword2026!",
        resetToken: activeResetToken,
      },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.match(res.data.message, /Password reset successful/);

    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    assert.strictEqual(userInDb.resetPasswordToken, undefined);
    assert.strictEqual(userInDb.isOtpVerified, false);

    // Verify password is now the new password
    const matchesNew = await bcrypt.compare("BrandNewSecurePassword2026!", userInDb.password);
    assert.strictEqual(matchesNew, true);

    const matchesOld = await bcrypt.compare("OldPassword123!", userInDb.password);
    assert.strictEqual(matchesOld, false);
  });

  // Test 9: Replay attack prevention (token is single-use)
  await test("9. Replay attack is strictly blocked (token is single-use)", async () => {
    const res = await resetPasswordHandler({
      body: {
        email: "student@example.com",
        newPassword: "AnotherPassword123!",
        resetToken: activeResetToken,
      },
      tenantId: "tenant_physics",
    });

    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /expired or is invalid/);
  });

  // Test 10: Backwards compatibility with 'password' field in payload
  await test("10. Accepts payload using 'password' instead of 'newPassword'", async () => {
    const u = await MockUser.findOne({ email: "student@example.com" });
    u.otpExpires = new Date(Date.now() - 1000);
    await u.save();

    const sendRes = await sendOtpHandler({ body: { email: "student@example.com" } });
    const verifyRes = await verifyOtpHandler({ body: { email: "student@example.com", otp: sendRes.data.devOtp } });

    const res = await resetPasswordHandler({
      body: {
        email: "student@example.com",
        password: "CompatibilityPassword2026!",
        resetToken: verifyRes.data.resetToken,
      },
    });

    assert.strictEqual(res.status, 200);
    const userInDb = await MockUser.findOne({ email: "student@example.com" });
    const matchesCompat = await bcrypt.compare("CompatibilityPassword2026!", userInDb.password);
    assert.strictEqual(matchesCompat, true);
  });

  console.log("--------------------------------------------------");
  console.log(` RESULTS: ${passed}/${passed + failed} FORGOT PASSWORD TESTS PASSED`);
  console.log("--------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
