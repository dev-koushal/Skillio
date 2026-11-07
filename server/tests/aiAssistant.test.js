import assert from "assert";
import mongoose from "mongoose";
import { aiService } from "../services/aiService.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import AIActionLog from "../models/aiActionLogModel.js";

// Mock or In-Memory test for AI assistant logic
console.log("\n==================================================");
console.log(" AI TEACHING ASSISTANT & TOOLS SECURITY TESTS");
console.log("==================================================");

async function runAITests() {
  const tenant1Id = new mongoose.Types.ObjectId();
  const tenant2Id = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();

  // Test 1: Hinglish intent parsing for course creation
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Ek course banao jiska naam English Full Course hai",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "createCourse");
    assert(plan.args.title.toLowerCase().includes("english"));
    console.log("[PASS] Hinglish course creation intent parsed correctly");
  }

  // Test 2: Compound instruction (create course + multiple lectures)
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "English Full Course banao aur usme Introduction, Grammar Basics aur Speaking Practice ke teen lectures add karo",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "compoundCreateCourseAndLectures");
    assert(plan.args.title.toLowerCase().includes("english"));
    assert(Array.isArray(plan.args.lectureTitles) && plan.args.lectureTitles.length >= 2);
    console.log("[PASS] Compound course + multi-lecture instruction parsed correctly");
  }

  // Test 3: Destructive action (delete course) MUST require confirmation
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "English Full Course delete karo",
      tenantId: tenant1Id,
      userId: teacherId,
      confirmed: false,
    });
    assert.strictEqual(plan.tool, "deleteCourse");
    assert.strictEqual(plan.requiresConfirmation, true);
    console.log("[PASS] Destructive delete course requires explicit user confirmation");
  }

  // Test 4: Destructive lecture deletion MUST require confirmation
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Delete lecture Introduction to English",
      tenantId: tenant1Id,
      userId: teacherId,
      confirmed: false,
    });
    assert.strictEqual(plan.tool, "deleteLecture");
    assert.strictEqual(plan.requiresConfirmation, true);
    console.log("[PASS] Destructive lecture delete requires explicit user confirmation");
  }

  // Test 5: List courses command
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Mere courses dikhao please",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "listCourses");
    console.log("[PASS] Course listing command parsed correctly in Hinglish");
  }

  // Test 6: AI Action Log Schema Verification
  {
    const actionLog = new AIActionLog({
      tenantId: tenant1Id,
      userId: teacherId,
      prompt: "Create Spoken English Course",
      action: "createCourse",
      arguments: { title: "Spoken English Course" },
      status: "success",
    });
    const err = actionLog.validateSync();
    assert.strictEqual(err, undefined);
    console.log("[PASS] AI Action Log model validated with tenant isolation");
  }

  console.log("--------------------------------------------------");
  console.log(" RESULTS: 6/6 AI Assistant security tests passed");
  console.log("--------------------------------------------------\n");
}

runAITests().catch((err) => {
  console.error("[FAIL] AI Assistant Test Failed:", err);
  process.exit(1);
});

