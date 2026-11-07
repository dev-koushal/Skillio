import assert from "assert";
import mongoose from "mongoose";
import { aiService } from "../services/aiService.js";
import { TOOL_REGISTRY, OPENAI_TOOL_DEFINITIONS } from "../services/aiTools.js";
import AIActionLog from "../models/aiActionLogModel.js";

console.log("\n==================================================");
console.log(" PRODUCTION AI AGENT & TOOLS SECURITY TEST SUITE");
console.log("==================================================");

async function runAITests() {
  const tenant1Id = new mongoose.Types.ObjectId();
  const tenant2Id = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

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

  // Test 6: AI Action Log Schema Verification with tenant isolation
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

  // Test 7: RBAC Guardrail: Block Student from using Educator AI Agent
  {
    let blocked = false;
    try {
      await aiService.processCommand({
        tenantId: tenant1Id,
        userId: studentId,
        userRole: "student",
        prompt: "Create a course",
      });
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes("Access Denied")) {
        blocked = true;
      }
    }
    assert.strictEqual(blocked, true, "Student should be strictly blocked with 403");
    console.log("[PASS] RBAC: Student access to AI Teaching Assistant strictly blocked (403)");
  }

  // Test 8: Structured Tool Registry Integrity
  {
    assert(Array.isArray(OPENAI_TOOL_DEFINITIONS) && OPENAI_TOOL_DEFINITIONS.length >= 15);
    for (const toolDef of OPENAI_TOOL_DEFINITIONS) {
      assert.strictEqual(toolDef.type, "function");
      assert(toolDef.function?.name, "Tool must have a name");
      assert(toolDef.function?.description, "Tool must have a description");
      assert(toolDef.function?.parameters, "Tool must have parameters schema");
    }
    console.log(`[PASS] Tool Registry: All ${OPENAI_TOOL_DEFINITIONS.length} OpenAI tool schemas validated`);
  }

  // Test 9: Natural Language Course Pricing and Metadata Extraction
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Create a course called Complete English Mastery. Description: Learn English from beginner to advanced. Price 999.",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "createCourse");
    assert(plan.args.title.toLowerCase().includes("english mastery"));
    assert.strictEqual(plan.args.price, 999);
    assert(plan.args.description.toLowerCase().includes("beginner to advanced"));
    console.log("[PASS] Natural Language: Course metadata, description, and price extracted accurately");
  }

  // Test 10: Natural Language Study Resource & PDF Upload Tool Selection
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Add a PDF called Grammar Notes to this course",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "addResource");
    assert(plan.args.title.toLowerCase().includes("grammar notes"));
    console.log("[PASS] Study Notes & PDF resource tool selection parsed correctly");
  }

  // Test 11: Natural Language Academy Analytics / Earnings Query
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "How many students enrolled and what are my total tuition earnings?",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "getAcademyAnalytics");
    console.log("[PASS] Analytics and tuition revenue query mapped to getAcademyAnalytics");
  }

  // Test 12: Natural Language Institution Branding Update
  {
    const plan = await aiService.parseIntentAndPlan({
      prompt: "Change my academy's primary color to #2563eb",
      tenantId: tenant1Id,
      userId: teacherId,
    });
    assert.strictEqual(plan.tool, "updateAcademyBranding");
    assert.strictEqual(plan.args.primaryColor, "#2563eb");
    console.log("[PASS] Academy branding and theme color update mapped correctly");
  }

  console.log("--------------------------------------------------");
  console.log(" RESULTS: 12/12 AI Assistant & Agent tests passed");
  console.log("--------------------------------------------------\n");
}

runAITests().catch((err) => {
  console.error("[FAIL] AI Assistant Test Failed:", err);
  process.exit(1);
});
