import { courseService } from "./courseService.js";
import { lectureService } from "./lectureService.js";
import { resourceService } from "./resourceService.js";
import { tenantService } from "./tenantService.js";
import { analyticsService } from "./analyticsService.js";
import { TOOL_REGISTRY, OPENAI_TOOL_DEFINITIONS } from "./aiTools.js";
import AIActionLog from "../models/aiActionLogModel.js";
import Tenant from "../models/tenantModel.js";

/**
 * Production-Grade AI Application Agent for LMS SaaS Educators.
 * Operates purely via structured tool calling against backend business services.
 * Strictly scopes every action to the authenticated tenant and user.
 */
export const aiService = {
  /**
   * Main entry point to process an educator instruction or action.
   */
  async processCommand({
    tenantId,
    userId,
    userRole,
    prompt,
    currentCourseId = null,
    currentRoute = null,
    confirmed = false,
    confirmationAction = null,
    messagesHistory = [],
  }) {
    // 1. RBAC Guardrail: Strictly block non-educators
    if (userRole !== "educator" && userRole !== "tenant_admin" && userRole !== "platform_admin") {
      const err = new Error("Access Denied: AI Teaching Assistant is only available for educators and administrators.");
      err.statusCode = 403;
      throw err;
    }

    if (!prompt && !confirmed) {
      return {
        success: false,
        message: "Please speak or type what you would like to create or manage.",
      };
    }

    const startTime = Date.now();
    const cleanPrompt = (prompt || "").trim();

    try {
      // 2. Handle Confirmed Action Execution
      if (confirmed && confirmationAction && confirmationAction.tool) {
        const toolName = confirmationAction.tool;
        const tool = TOOL_REGISTRY[toolName];
        if (!tool) {
          throw new Error(`Unknown tool "${toolName}" for confirmed execution`);
        }

        const result = await tool.execute({
          tenantId,
          userId,
          userRole,
          args: confirmationAction.args || {},
          context: { currentCourseId, currentRoute },
        });

        await AIActionLog.create({
          tenantId,
          userId,
          prompt: cleanPrompt || `Confirmed: ${toolName}`,
          action: toolName,
          arguments: confirmationAction.args,
          result: result.data || null,
          status: "success",
        });

        return {
          success: true,
          message: result.message,
          data: result.data,
          action: toolName,
        };
      }

      // 3. Gather Application Context
      const [existingCourses, tenant] = await Promise.all([
        courseService.listCreatorCourses({ tenantId, userId }),
        Tenant.findById(tenantId).select("name title primaryColor secondaryColor"),
      ]);

      const coursesSummary = (existingCourses || [])
        .map((c) => `ID: ${c._id}, Title: "${c.title}", Status: ${c.isPublished ? "Published" : "Draft"}, Price: ₹${c.price}, Lectures: ${c.lectures?.length || 0}`)
        .join("; ");

      const context = {
        tenantId,
        institutionName: tenant?.name || "Academy",
        currentRoute: currentRoute || "/educator",
        currentCourseId: currentCourseId || (existingCourses?.[0]?._id ? existingCourses[0]._id.toString() : null),
        coursesSummary,
      };

      // 4. Attempt Structured Tool Selection via OpenAI API
      const apiKey = process.env.OPENAI_API_KEY;
      let toolPlan = null;
      let assistantReplyText = null;

      if (apiKey && apiKey.startsWith("sk-")) {
        try {
          const planFromLLM = await this.callOpenAIAgent({
            prompt: cleanPrompt,
            context,
            messagesHistory,
          });

          if (planFromLLM.toolCalls && planFromLLM.toolCalls.length > 0) {
            toolPlan = planFromLLM.toolCalls[0];
          } else if (planFromLLM.replyText) {
            assistantReplyText = planFromLLM.replyText;
          }
        } catch (llmError) {
          console.warn("[OpenAI Agent Warning, switching to fallback parser]", llmError.message);
        }
      }

      // 5. Fallback Semantic Parser if LLM is unavailable or offline
      if (!toolPlan && !assistantReplyText) {
        toolPlan = this.semanticFallbackParser({
          prompt: cleanPrompt,
          context,
          existingCourses,
        });
      }

      // If purely informational response without tool call
      if (!toolPlan) {
        return {
          success: true,
          message: assistantReplyText || "How can I assist you with your courses, lectures, or academy settings?",
          action: "chat",
        };
      }

      const toolName = toolPlan.tool;
      const tool = TOOL_REGISTRY[toolName];

      if (!tool) {
        return {
          success: true,
          message: assistantReplyText || `I understand your request, but I couldn't match a safe application tool for it.`,
        };
      }

      // 6. High-Impact Action Safety Guardrail: Check if confirmation is required
      if (tool.requiresConfirmation(toolPlan.args, context)) {
        const confMsg = tool.confirmationMessage
          ? tool.confirmationMessage(toolPlan.args, context)
          : `Are you sure you want to proceed with ${toolName}?`;

        await AIActionLog.create({
          tenantId,
          userId,
          prompt: cleanPrompt,
          action: toolName,
          arguments: toolPlan.args,
          status: "requires_confirmation",
        });

        return {
          success: true,
          requiresConfirmation: true,
          confirmationMessage: confMsg,
          actionData: {
            tool: toolName,
            args: toolPlan.args,
          },
        };
      }

      // 7. Execute Structured Tool Operation
      const executionResult = await tool.execute({
        tenantId,
        userId,
        userRole,
        args: toolPlan.args,
        context,
      });

      // 8. Log Successful Action in Audit Log
      await AIActionLog.create({
        tenantId,
        userId,
        prompt: cleanPrompt,
        action: toolName,
        arguments: toolPlan.args,
        result: executionResult.data || null,
        status: "success",
      });

      return {
        success: true,
        message: executionResult.message,
        data: executionResult.data,
        action: toolName,
      };
    } catch (error) {
      console.error("[AIService processCommand Error]", error);

      try {
        await AIActionLog.create({
          tenantId,
          userId,
          prompt: cleanPrompt,
          action: "unknown",
          status: "failed",
          errorMessage: error.message,
        });
      } catch (logErr) {
        // ignore logging error
      }

      return {
        success: false,
        message: `I encountered an issue: ${error.message || "Failed to execute instruction"}`,
      };
    }
  },

  /**
   * Parse prompt into an executable tool plan using semantic intent parsing and tool registry.
   */
  async parseIntentAndPlan({ prompt, tenantId, userId, currentCourseId = null, confirmed = false }) {
    const plan = this.semanticFallbackParser({
      prompt: (prompt || "").trim(),
      context: { currentCourseId, tenantId },
      existingCourses: [],
    });

    if (!plan) {
      return { tool: "clarify", args: { prompt } };
    }

    const tool = TOOL_REGISTRY[plan.tool];
    const requiresConfirmation = tool ? tool.requiresConfirmation(plan.args, { currentCourseId }) : false;
    const confirmationMessage = tool?.confirmationMessage ? tool.confirmationMessage(plan.args, { currentCourseId }) : undefined;

    return {
      tool: plan.tool,
      args: plan.args,
      requiresConfirmation,
      confirmationMessage,
    };
  },

  /**
   * Calls OpenAI Chat Completions with Tools schema.
   */
  async callOpenAIAgent({ prompt, context, messagesHistory = [] }) {
    const apiKey = process.env.OPENAI_API_KEY;

    const systemPrompt = `You are the Skillio Application Agent for educators in academy "${context.institutionName}".
Your role is to understand educator instructions (in English, Hindi, or Hinglish) and select the exact structured tool to execute the action safely.
Current Context:
- Active Route: ${context.currentRoute}
- Active Course ID: ${context.currentCourseId || "None"}
- Educator's Courses: ${context.coursesSummary || "None"}

Rules:
1. Always select the most appropriate tool from the tool registry.
2. If the user mentions creating a course and also lists lectures (e.g. "Create course X and add lectures A, B, C"), select compoundCreateCourseAndLectures.
3. If the user asks about tuition earnings, active students, or top courses, select getAcademyAnalytics.
4. If the user asks to change theme colors or institution name/description, select updateAcademyBranding.
5. If the user provides an outline or asks for syllabus/curriculum ideas, select generateCurriculumOutline.
6. For course deletion or lecture deletion, select deleteCourse or deleteLecture.
7. Output tool calls using function calling.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...messagesHistory.slice(-4),
      { role: "user", content: prompt },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools: OPENAI_TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API responded with status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;

    if (!choice) return { toolCalls: [], replyText: null };

    const toolCalls = [];
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      for (const tc of choice.tool_calls) {
        if (tc.type === "function" && tc.function) {
          try {
            const parsedArgs = JSON.parse(tc.function.arguments || "{}");
            toolCalls.push({
              tool: tc.function.name,
              args: parsedArgs,
            });
          } catch (e) {
            console.warn("Failed to parse tool call arguments:", e);
          }
        }
      }
    }

    return {
      toolCalls,
      replyText: choice.content || null,
    };
  },

  /**
   * Resilient Semantic Fallback Parser.
   * Understands English, Hindi, and Hinglish. Maps user intent to structured tools.
   */
  semanticFallbackParser({ prompt, context, existingCourses = [] }) {
    const text = prompt.toLowerCase();

    // 1. ANALYTICS / EARNINGS / STUDENTS
    if (
      text.includes("how many students") ||
      text.includes("kitne students") ||
      text.includes("total students") ||
      text.includes("earnings") ||
      text.includes("revenue") ||
      text.includes("kamai") ||
      text.includes("performing best") ||
      text.includes("best performing") ||
      text.includes("analytics") ||
      text.includes("performance")
    ) {
      // Course-specific analytics?
      const targetCourse = existingCourses.find((c) => text.includes(c.title.toLowerCase()));
      if (targetCourse) {
        return {
          tool: "getCourseAnalytics",
          args: { courseId: targetCourse._id.toString(), courseTitle: targetCourse.title },
        };
      }
      return {
        tool: "getAcademyAnalytics",
        args: {},
      };
    }

    // 2. LIST COURSES
    if (
      text.includes("show my courses") ||
      text.includes("mere courses") ||
      text.includes("courses dikhao") ||
      text.includes("list courses") ||
      text.includes("all courses") ||
      text.includes("show courses")
    ) {
      return {
        tool: "listCourses",
        args: { filter: "all" },
      };
    }

    // 3. DELETE COURSE (Destructive)
    if (
      (text.includes("delete course") || text.includes("course delete") || text.includes("remove course")) &&
      !text.includes("lecture")
    ) {
      let title = "";
      const match = prompt.match(/(?:course|naam|called|named)\s+["']?([^"'\n]+?)["']?(?:\s+(?:delete|karo|ko|please)|$)/i);
      if (match && match[1]) {
        title = match[1].replace(/delete|karo|please|ko/gi, "").trim();
      }
      const existing = existingCourses.find((c) => text.includes(c.title.toLowerCase()));
      return {
        tool: "deleteCourse",
        args: {
          courseId: existing ? existing._id.toString() : context.currentCourseId,
          courseTitle: existing ? existing.title : title,
        },
      };
    }

    // 4. DELETE LECTURE (Destructive)
    if (text.includes("delete lecture") || text.includes("lecture delete") || text.includes("remove lecture")) {
      let lectureTitle = "";
      const match = prompt.match(/(?:lecture|naam|called|named)\s+["']?([^"'\n]+?)["']?(?:\s+(?:delete|karo|ko|please)|$)/i);
      if (match && match[1]) {
        lectureTitle = match[1].replace(/delete|karo|please|ko/gi, "").trim();
      }
      return {
        tool: "deleteLecture",
        args: {
          lectureTitle,
          courseId: context.currentCourseId,
        },
      };
    }

    // 5. PUBLISH / UNPUBLISH COURSE
    if (text.includes("publish") || text.includes("unpublish") || text.includes("live karo") || text.includes("draft")) {
      const isUnpublish = text.includes("unpublish") || text.includes("draft");
      const existing = existingCourses.find((c) => text.includes(c.title.toLowerCase()));

      let title = existing ? existing.title : "";
      if (!title) {
        const match = prompt.match(/(?:course|publish|unpublish|live|naam)\s+["']?([^"'\n]+?)["']?(?:\s+(?:ko|publish|karo|hai)|$)/i);
        if (match && match[1]) {
          title = match[1].replace(/publish|unpublish|live|course|ko|kar do|karo/gi, "").trim();
        }
      }

      return {
        tool: "publishCourse",
        args: {
          courseId: existing ? existing._id.toString() : context.currentCourseId,
          courseTitle: title,
          isPublished: !isUnpublish,
        },
      };
    }

    // 6. UPDATE PRICE
    if (
      !text.includes("create") &&
      !text.includes("banao") &&
      (text.includes("change price") ||
        text.includes("set price") ||
        text.includes("update price") ||
        text.includes("make this course free") ||
        text.includes("make it free") ||
        (text.includes("price") && (text.includes("to") || text.includes("karo") || text.includes("change"))))
    ) {
      let price = 0;
      if (text.includes("free") || text.includes("muft")) {
        price = 0;
      } else {
        const numMatch = prompt.match(/(?:₹|rs\.?|inr|to|price)\s*(\d+)/i);
        if (numMatch && numMatch[1]) {
          price = Number(numMatch[1]);
        }
      }

      const existing = existingCourses.find((c) => text.includes(c.title.toLowerCase()));

      return {
        tool: "updateCourse",
        args: {
          courseId: existing ? existing._id.toString() : context.currentCourseId,
          price,
        },
      };
    }

    // 7. BRANDING / THEME / ACADEMY SETTINGS
    if (
      text.includes("primary color") ||
      text.includes("brand color") ||
      text.includes("academy description") ||
      text.includes("academy name") ||
      text.includes("institution description")
    ) {
      const hexMatch = prompt.match(/#([0-9a-f]{3,6})/i);
      const color = hexMatch ? hexMatch[0] : (text.includes("blue") ? "#2563eb" : text.includes("green") ? "#059669" : text.includes("purple") ? "#7c3aed" : null);

      return {
        tool: "updateAcademyBranding",
        args: {
          primaryColor: color || undefined,
          description: text.includes("description") ? prompt.replace(/update|my|academy|description|to|change/gi, "").trim() : undefined,
        },
      };
    }

    // 8. ADD RESOURCE / PDF / STUDY NOTES
    if (text.includes("resource") || text.includes("pdf") || text.includes("notes") || text.includes("formula sheet")) {
      let title = "Course Study Notes";
      const namedMatch = prompt.match(/(?:called|named|naam)\s+["']?([^"'\n]+?)["']?(?:\s+(?:to|in|mein|for)|$)/i);
      const generalMatch = prompt.match(/(?:pdf|notes|resource|sheet)\s+["']?([^"'\n]+?)["']?(?:\s+(?:to|in|mein|for)|$)/i);
      if (namedMatch && namedMatch[1]) {
        title = namedMatch[1].replace(/called|named/gi, "").trim();
      } else if (generalMatch && generalMatch[1]) {
        title = generalMatch[1].replace(/called|named|pdf|notes/gi, "").trim();
      }

      return {
        tool: "addResource",
        args: {
          title,
          type: "pdf",
          fileUrl: "/public/notes-template.pdf",
        },
      };
    }

    // 9. COMPOUND: CREATE COURSE AND MULTIPLE LECTURES
    if (
      (text.includes("banao") || text.includes("create")) &&
      text.includes("course") &&
      (text.includes("lecture") || text.includes("lectures") || text.includes("1.") || text.includes("modules"))
    ) {
      let courseTitle = "New Course";
      const calledMatch = prompt.match(/(?:named|called|jiska naam)\s+["']?([^"'\n]+?)["']?(?:\s+(?:hai|aur|with|having)|$)/i);
      const beforeBanaoMatch = prompt.match(/^(.+?)\s+(?:course\s+)?banao/i);
      const createCourseMatch = prompt.match(/(?:create|banao)\s+(?:a\s+)?(?:course\s+)?(?:called\s+|named\s+)?["']?([^"'\n]+?)["']?(?:\s+(?:aur|with|and)|$)/i);

      if (calledMatch && calledMatch[1]) {
        courseTitle = calledMatch[1].trim();
      } else if (beforeBanaoMatch && beforeBanaoMatch[1]) {
        courseTitle = beforeBanaoMatch[1].replace(/create|new|ek/gi, "").trim();
      } else if (createCourseMatch && createCourseMatch[1]) {
        courseTitle = createCourseMatch[1].trim();
      }

      if (!courseTitle.toLowerCase().includes("course")) {
        courseTitle = courseTitle + " Course";
      }

      // Extract numbered or comma-separated lectures
      const lectureTitles = [];
      const lines = prompt.split(/\n/);
      for (const line of lines) {
        const numMatch = line.match(/^\s*(?:\d+[\.\)]|-|\*)\s*(.+)/);
        if (numMatch && numMatch[1]) {
          lectureTitles.push(numMatch[1].trim());
        }
      }

      if (lectureTitles.length === 0) {
        const parts = prompt.split(/(?:lectures?|aur|and|,)/i);
        for (const part of parts) {
          const cleaned = part.replace(/ke teen|ke|three|banao|add karo|add|course|mein|usme|these/gi, "").trim();
          if (cleaned.length > 2 && cleaned.length < 50 && !cleaned.toLowerCase().includes(courseTitle.toLowerCase())) {
            lectureTitles.push(cleaned);
          }
        }
      }

      return {
        tool: "compoundCreateCourseAndLectures",
        args: {
          title: courseTitle,
          lectureTitles: lectureTitles.length > 0 ? lectureTitles.slice(0, 6) : ["Introduction", "Core Concepts", "Practice & Application"],
        },
      };
    }

    // 10. ADD LECTURE
    if (text.includes("lecture") && (text.includes("add") || text.includes("banao") || text.includes("create") || text.includes("dalo"))) {
      let lectureTitle = "New Lecture";
      let courseTitle = "";

      const lectureMatch = prompt.match(/(?:lecture|naam|called|named|title)\s+["']?([^"'\n,]+?)["']?(?:\s+(?:rakhna|add|hai|to)|$)/i);
      if (lectureMatch && lectureMatch[1]) {
        lectureTitle = lectureMatch[1].replace(/banao|add karo|mein|dalo|to/gi, "").trim();
      }

      const courseMatch = prompt.match(/([^"'\n]+?)\s+(?:mein|in|to)\s+(?:ek\s+)?lecture/i);
      if (courseMatch && courseMatch[1]) {
        courseTitle = courseMatch[1].trim();
      }

      return {
        tool: "createLecture",
        args: {
          courseId: context.currentCourseId,
          courseTitle,
          lectureTitle,
        },
      };
    }

    // 11. GENERATE COURSE OUTLINE / PLAN
    if (text.includes("generate") || text.includes("outline") || text.includes("curriculum") || text.includes("syllabus") || text.includes("plan")) {
      const topicMatch = prompt.match(/(?:for|about|on|ka)\s+["']?([^"']+)["']?/i);
      const topic = topicMatch ? topicMatch[1].trim() : (text.includes("english") ? "English Speaking" : "General");

      return {
        tool: "generateCurriculumOutline",
        args: {
          topic,
          lectureCount: 5,
        },
      };
    }

    // 12. CREATE STANDALONE COURSE
    if (text.includes("course") && (text.includes("banao") || text.includes("create") || text.includes("new"))) {
      let title = "New Course";
      const titleMatch = prompt.match(/(?:jiska naam|named|called|naam)\s+["']?([^"'\n\.]+?)["']?(?:\s*(?:\.|\b(?:hai|rakhna|description|price)\b)|$)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      } else {
        const simpleMatch = prompt.match(/(?:create|banao|new)\s+(?:a\s+)?(?:course\s+)?["']?([^"'\n\.]+?)["']?(?:\s*(?:\.|\b(?:course|hai|description|price)\b)|$)/i);
        if (simpleMatch && simpleMatch[1]) {
          title = simpleMatch[1].trim();
        }
      }

      // Check for price in prompt
      let price = 0;
      const priceMatch = prompt.match(/(?:price|₹|rs\.?)\s*(\d+)/i);
      if (priceMatch && priceMatch[1]) {
        price = Number(priceMatch[1]);
      }

      // Check for description in prompt
      let description = `Comprehensive curriculum designed for student mastery.`;
      const descMatch = prompt.match(/(?:description|details):\s*([^.\n]+)/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim();
      }

      return {
        tool: "createCourse",
        args: {
          title: title.replace(/^course\s+/i, "").replace(/\s+course$/i, "").trim() + (title.toLowerCase().includes("course") ? "" : " Course"),
          category: text.includes("english") ? "English" : text.includes("physics") ? "Physics" : "General",
          description,
          price,
        },
      };
    }

    return null;
  },
};
