import assert from "assert";
import mongoose from "mongoose";
import { verifyCourseAccess, sanitizeLecturesForViewer } from "../utils/courseAccess.js";
import Resource from "../models/resourceModel.js";
import Tenant from "../models/tenantModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";

async function runCourseAccessAndResourceTests() {
  console.log("\n==================================================");
  console.log(" COURSE ACCESS, LOCK ENFORCEMENT & RESOURCES TESTS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const test = (desc, fn) => {
    try {
      fn();
      console.log(`[PASS] ${desc}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${desc}`);
      console.error(e);
      failed++;
    }
  };

  // 1. Lecture Sanitization Test
  test("sanitizeLecturesForViewer: Scrubs videoUrl on locked lectures for non-enrolled viewers", () => {
    const mockLectures = [
      { _id: new mongoose.Types.ObjectId(), lectureTitle: "Intro", isPreviewFree: true, videoUrl: "https://video.com/free.mp4" },
      { _id: new mongoose.Types.ObjectId(), lectureTitle: "Advanced", isPreviewFree: false, videoUrl: "https://video.com/secret.mp4" },
    ];

    const sanitized = sanitizeLecturesForViewer(mockLectures, false);
    assert.strictEqual(sanitized[0].videoUrl, "https://video.com/free.mp4", "Preview free lecture should retain videoUrl");
    assert.strictEqual(sanitized[0].isLocked, false);
    assert.strictEqual(sanitized[1].videoUrl, null, "Locked lecture videoUrl must be scrubbed to null");
    assert.strictEqual(sanitized[1].isLocked, true);
  });

  test("sanitizeLecturesForViewer: Retains all videoUrls when user has full access", () => {
    const mockLectures = [
      { _id: new mongoose.Types.ObjectId(), lectureTitle: "Intro", isPreviewFree: true, videoUrl: "https://video.com/free.mp4" },
      { _id: new mongoose.Types.ObjectId(), lectureTitle: "Advanced", isPreviewFree: false, videoUrl: "https://video.com/secret.mp4" },
    ];

    const sanitized = sanitizeLecturesForViewer(mockLectures, true);
    assert.strictEqual(sanitized[0].videoUrl, "https://video.com/free.mp4");
    assert.strictEqual(sanitized[1].videoUrl, "https://video.com/secret.mp4", "Enrolled user should see locked video");
    assert.strictEqual(sanitized[1].isLocked, false);
  });

  // 2. Resource Schema Validation
  test("Resource Model: Requires tenantId, courseId, title, and fileUrl", () => {
    const resource = new Resource({
      tenantId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      title: "Newton's Laws Notes",
      fileUrl: "https://files.com/notes.pdf",
      type: "pdf",
      topic: "Mechanics",
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const error = resource.validateSync();
    assert.strictEqual(error, undefined, "Valid resource should have no validation errors");
    assert.strictEqual(resource.type, "pdf");
    assert.strictEqual(resource.topic, "Mechanics");
  });

  // 3. Institution Schema & Directory Validation
  test("Tenant Model: Supports ownerId, institutionType, and domainTags", () => {
    const tenant = new Tenant({
      name: "Quantum Physics Institute",
      slug: "quantum-physics",
      institutionType: "Coaching Center",
      description: "Advanced coaching for quantum physics and competitive Olympiads",
      domainTags: ["Physics", "Quantum", "Olympiad"],
    });

    assert.strictEqual(tenant.name, "Quantum Physics Institute");
    assert.strictEqual(tenant.institutionType, "Coaching Center");
    assert.strictEqual(tenant.domainTags.length, 3);
  });

  console.log("--------------------------------------------------");
  console.log(` RESULTS: ${passed}/${passed + failed} tests passed`);
  console.log("--------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runCourseAccessAndResourceTests();

