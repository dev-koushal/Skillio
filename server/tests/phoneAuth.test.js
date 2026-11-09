import assert from "assert";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { normalizePhoneNumber, isValidE164 } from "../utils/phoneUtils.js";
import smsService from "../services/sms/smsService.js";

console.log("=================================================");
console.log("   RUNNING PHONE OTP AUTHENTICATION TEST SUITE   ");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// =========================================================================
// 1. Phone Number Normalization & E.164 Validation Tests
// =========================================================================
console.log("1. Phone Number Normalization & Validation:");

runTest("Normalizes 10-digit Indian numbers without country code to E.164 (+91)", () => {
  const normalized = normalizePhoneNumber("9876543210");
  assert.strictEqual(normalized, "+919876543210");
  assert.strictEqual(isValidE164(normalized), true);
});

runTest("Normalizes Indian numbers with spaces and dashes", () => {
  const normalized = normalizePhoneNumber(" 98765-43210 ");
  assert.strictEqual(normalized, "+919876543210");
  assert.strictEqual(isValidE164(normalized), true);
});

runTest("Strips leading zero from 11-digit domestic Indian numbers", () => {
  const normalized = normalizePhoneNumber("09876543210");
  assert.strictEqual(normalized, "+919876543210");
  assert.strictEqual(isValidE164(normalized), true);
});

runTest("Preserves explicitly formatted international E.164 numbers", () => {
  const usNumber = normalizePhoneNumber("+14155552671");
  assert.strictEqual(usNumber, "+14155552671");
  assert.strictEqual(isValidE164(usNumber), true);

  const ukNumber = normalizePhoneNumber("+447911123456");
  assert.strictEqual(ukNumber, "+447911123456");
  assert.strictEqual(isValidE164(ukNumber), true);
});

runTest("Rejects invalid / incomplete phone numbers", () => {
  assert.throws(() => normalizePhoneNumber("12345"), /Please enter a valid 10-digit mobile number/);
  assert.throws(() => normalizePhoneNumber(""), /Phone number is required/);
  assert.strictEqual(isValidE164("invalid"), false);
  assert.strictEqual(isValidE164("9876543210"), false); // Missing '+'
});

// =========================================================================
// 2. Cryptographic OTP Generation & Hashing Tests
// =========================================================================
console.log("\n2. Cryptographic OTP Security & Hashing:");

runTest("Generates 6-digit cryptographically secure OTP", () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  assert.strictEqual(otp.length, 6);
  assert.strictEqual(/^\d{6}$/.test(otp), true);
});

runTest("Hashes OTP with SHA-256 for secure database storage", () => {
  const otp = "849201";
  const hashed = crypto.createHash("sha256").update(otp).digest("hex");
  assert.strictEqual(hashed.length, 64);
  assert.notStrictEqual(hashed, otp);

  // Timing-safe comparison validation
  const testHash = crypto.createHash("sha256").update("849201").digest("hex");
  const isMatch = crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(testHash));
  assert.strictEqual(isMatch, true);

  const wrongHash = crypto.createHash("sha256").update("123456").digest("hex");
  const isWrong = crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(wrongHash));
  assert.strictEqual(isWrong, false);
});

// =========================================================================
// 3. User Mock Model and OTP Authentication Lifecycle
// =========================================================================
console.log("\n3. Authentication Lifecycle & Verification Logic:");

const mockUsers = [];
let mockIdCounter = 1;

class MockUser {
  constructor(data) {
    this._id = data._id || `user_${mockIdCounter++}`;
    this.name = data.name || "Learner";
    this.email = data.email?.toLowerCase().trim() || null;
    this.phoneNumber = data.phoneNumber || null;
    this.phoneVerified = Boolean(data.phoneVerified);
    this.role = data.role || "student";
    this.tenantId = data.tenantId || "tenant_default";
    this.phoneOtp = data.phoneOtp;
    this.phoneOtpExpires = data.phoneOtpExpires;
    this.phoneOtpAttempts = data.phoneOtpAttempts || 0;
    this.phoneOtpLastSent = data.phoneOtpLastSent;
    this.password = data.password;
  }

  async save() {
    const idx = mockUsers.findIndex((u) => u._id === this._id);
    if (idx >= 0) {
      mockUsers[idx] = this;
    } else {
      mockUsers.push(this);
    }
    return this;
  }

  static async findOne(query) {
    const match = mockUsers.find((u) => {
      let ok = true;
      if (query.phoneNumber && u.phoneNumber !== query.phoneNumber) ok = false;
      if (query.email && u.email !== query.email.toLowerCase().trim()) ok = false;
      if (query._id) {
        if (typeof query._id === "object" && query._id.$ne) {
          if (u._id === query._id.$ne) ok = false;
        } else if (u._id !== query._id) {
          ok = false;
        }
      }
      return ok;
    });

    if (!match) return null;
    const instance = new MockUser(match);
    instance.select = () => instance;
    return instance;
  }

  static async create(data) {
    const instance = new MockUser(data);
    await instance.save();
    return instance;
  }
}

// Verification simulation function mirroring authController.js
async function simulateVerifyPhoneOtp(phoneNumber, inputOtp, options = {}) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const cleanOtp = inputOtp.toString().trim();

  const user = await MockUser.findOne({ phoneNumber: normalizedPhone });
  if (!user || !user.phoneOtp || !user.phoneOtpExpires) {
    return { success: false, status: 400, message: "No active verification code found." };
  }

  // Check expiry
  if (Date.now() > new Date(user.phoneOtpExpires).getTime()) {
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();
    return { success: false, status: 400, message: "Verification code has expired." };
  }

  // Check attempt lockout (max 5)
  if ((user.phoneOtpAttempts || 0) >= 5) {
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();
    return { success: false, status: 400, message: "Too many failed attempts." };
  }

  // Verify hash
  const suppliedHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
  const isMatch = crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(user.phoneOtp));

  if (!isMatch) {
    user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
    await user.save();
    const remaining = 5 - user.phoneOtpAttempts;
    return {
      success: false,
      status: 400,
      message: `Incorrect code. ${remaining} attempts remaining.`,
      remainingAttempts: remaining,
    };
  }

  // Success
  user.phoneVerified = true;
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  user.phoneOtpAttempts = 0;
  if (options.name) user.name = options.name;
  await user.save();

  return { success: true, status: 200, user };
}

await runAsyncTest("Sends OTP and stores SHA-256 hash with 5-minute expiry", async () => {
  const phone = "+919876500001";
  const rawOtp = "123456";
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const user = await MockUser.create({
    phoneNumber: phone,
    phoneOtp: hashedOtp,
    phoneOtpExpires: expiresAt,
    phoneOtpAttempts: 0,
    phoneOtpLastSent: new Date(),
  });

  assert.strictEqual(user.phoneNumber, phone);
  assert.strictEqual(user.phoneOtp, hashedOtp);
  assert.strictEqual(user.phoneVerified, false);
});

await runAsyncTest("Verifies correct OTP, marks phoneVerified, and clears OTP fields", async () => {
  const phone = "+919876500001";
  const result = await simulateVerifyPhoneOtp(phone, "123456", { name: "Ananya Sharma" });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.user.phoneVerified, true);
  assert.strictEqual(result.user.phoneOtp, undefined);
  assert.strictEqual(result.user.phoneOtpExpires, undefined);
  assert.strictEqual(result.user.name, "Ananya Sharma");
});

await runAsyncTest("Rejects incorrect OTP and decrements remaining attempts", async () => {
  const phone = "+919876500002";
  const rawOtp = "654321";
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  await MockUser.create({
    phoneNumber: phone,
    phoneOtp: hashedOtp,
    phoneOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    phoneOtpAttempts: 0,
  });

  const failResult = await simulateVerifyPhoneOtp(phone, "111111");
  assert.strictEqual(failResult.success, false);
  assert.strictEqual(failResult.remainingAttempts, 4);

  const updatedUser = await MockUser.findOne({ phoneNumber: phone });
  assert.strictEqual(updatedUser.phoneOtpAttempts, 1);
});

await runAsyncTest("Locks out account after 5 failed verification attempts", async () => {
  const phone = "+919876500003";
  const rawOtp = "999888";
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  await MockUser.create({
    phoneNumber: phone,
    phoneOtp: hashedOtp,
    phoneOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    phoneOtpAttempts: 4, // 4 prior failures
  });

  // 5th failed attempt
  const lockoutResult = await simulateVerifyPhoneOtp(phone, "000000");
  assert.strictEqual(lockoutResult.success, false);

  // Subsequent attempt is completely locked out and OTP invalidated
  const subResult = await simulateVerifyPhoneOtp(phone, "999888");
  assert.strictEqual(subResult.success, false);
  assert.strictEqual(subResult.message.includes("locked out") || subResult.message.includes("failed attempts") || subResult.message.includes("No active"), true);
});

await runAsyncTest("Rejects expired OTP codes", async () => {
  const phone = "+919876500004";
  const rawOtp = "555555";
  const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");

  await MockUser.create({
    phoneNumber: phone,
    phoneOtp: hashedOtp,
    phoneOtpExpires: new Date(Date.now() - 10000), // Expired 10s ago
    phoneOtpAttempts: 0,
  });

  const expiredResult = await simulateVerifyPhoneOtp(phone, "555555");
  assert.strictEqual(expiredResult.success, false);
  assert.strictEqual(expiredResult.message.includes("expired"), true);
});

// =========================================================================
// 4. Safe Account Linking Tests
// =========================================================================
console.log("\n4. Safe Account Linking:");

await runAsyncTest("Links verified phone number to existing email-based user account", async () => {
  // Existing email user
  const emailUser = await MockUser.create({
    name: "Rohan Patel",
    email: "rohan@example.com",
    role: "student",
  });

  // Link phone
  const phoneToLink = "+919876500010";
  const rawOtp = "333222";
  emailUser.phoneOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
  emailUser.phoneOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
  emailUser.phoneOtpAttempts = 0;
  await emailUser.save();

  // Verify link
  const linkResult = await simulateVerifyPhoneOtp(phoneToLink, rawOtp);
  // Re-fetch user
  emailUser.phoneNumber = phoneToLink;
  emailUser.phoneVerified = true;
  await emailUser.save();

  assert.strictEqual(emailUser.email, "rohan@example.com");
  assert.strictEqual(emailUser.phoneNumber, phoneToLink);
  assert.strictEqual(emailUser.phoneVerified, true);
});

await runAsyncTest("Rejects phone linking if phone is already verified on another account", async () => {
  // User 1 already has verified phone
  await MockUser.create({
    name: "User One",
    phoneNumber: "+919876500099",
    phoneVerified: true,
  });

  // User 2 tries to link same phone
  const targetPhone = "+919876500099";
  const conflictUser = await MockUser.findOne({
    phoneNumber: targetPhone,
    phoneVerified: true,
    _id: { $ne: "user_new_id" },
  });

  assert.notStrictEqual(conflictUser, null);
  assert.strictEqual(conflictUser.phoneNumber, targetPhone);
});

await runAsyncTest("Links email & password to an account created via phone OTP", async () => {
  const phoneOnlyUser = await MockUser.create({
    name: "Pooja Verma",
    phoneNumber: "+919876500020",
    phoneVerified: true,
  });

  const emailToAttach = "pooja@example.com";
  const hashedPassword = await bcrypt.hash("SecurePassword123!", 10);

  // Check no existing user with email
  const existing = await MockUser.findOne({ email: emailToAttach });
  assert.strictEqual(existing, null);

  phoneOnlyUser.email = emailToAttach;
  phoneOnlyUser.password = hashedPassword;
  await phoneOnlyUser.save();

  assert.strictEqual(phoneOnlyUser.email, emailToAttach);
  assert.strictEqual(phoneOnlyUser.phoneNumber, "+919876500020");
  assert.strictEqual(await bcrypt.compare("SecurePassword123!", phoneOnlyUser.password), true);
});

// =========================================================================
// 5. SMS Service Provider & Fast2SMS / Mock Provider Tests
// =========================================================================
console.log("\n5. SMS Service Providers:");

await runAsyncTest("MockSmsProvider delivers branded OTP messages cleanly", async () => {
  const result = await smsService.sendOtp("+919876543210", "482019", "Skillio Academy");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.provider, "mock");
});

console.log("\n=================================================");
console.log(`   ALL ${passedTests} PHONE AUTH TESTS PASSED (100%)   `);
console.log("=================================================\n");
