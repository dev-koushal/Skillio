import { courseService } from "./courseService.js";
import { lectureService } from "./lectureService.js";
import AIActionLog from "../models/aiActionLogModel.js";

/**
 * AI Assistant Service for Educators.
 * Operates purely through authorized tool execution with multi-tenant isolation.
 */
export const aiService = {
  /**
   * Main entry point to process an educator prompt or action.
   */
  async processCommand({ tenantId, userId, userRole, prompt, currentCourseId = null, confirmed = false }) {
    if (!prompt || !prompt.trim()) {
      return {
        success: false,
        message: "Please speak or type what you would like to create or manage.",
      };
    }

    const cleanPrompt = prompt.trim();

    try {
      // 1. Detect Intent and Extract Tool Arguments
      const plan = await this.parseIntentAndPlan({
        prompt: cleanPrompt,
        tenantId,
        userId,
        currentCourseId,
        confirmed,
      });

      // 2. High-impact action verification (destructive actions need confirmation)
      if (plan.requiresConfirmation && !confirmed) {
        // Log confirmation request
        await AIActionLog.create({
          tenantId,
          userId,
          prompt: cleanPrompt,
          action: plan.tool,
          arguments: plan.args,
          status: "requires_confirmation",
        });

        return {
          success: true,
          requiresConfirmation: true,
          confirmationMessage: plan.confirmationMessage || `Are you sure you want to proceed with this action?`,
          actionData: {
            tool: plan.tool,
            args: plan.args,
          },
        };
      }

      // 3. Execute Tool Operations
      const executionResult = await this.executeToolPlan({
        plan,
        tenantId,
        userId,
        userRole,
      });

      // 4. Log Successful Action
      await AIActionLog.create({
        tenantId,
        userId,
        prompt: cleanPrompt,
        action: plan.tool,
        arguments: plan.args,
        result: executionResult.data || null,
        status: "success",
      });

      return {
        success: true,
        message: executionResult.message,
        data: executionResult.data,
        action: plan.tool,
      };
    } catch (error) {
      console.error("[AIService Error]", error);

      // Log failure
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
   * Parse prompt into an executable tool plan.
   * Understands English, Hindi, and Hinglish.
   */
  async parseIntentAndPlan({ prompt, tenantId, userId, currentCourseId, confirmed }) {
    const text = prompt.toLowerCase();

    // 1. SHOW / LIST COURSES
    if (
      text.includes("show my courses") ||
      text.includes("mere courses") ||
      text.includes("courses dikhao") ||
      text.includes("list courses") ||
      text.includes("all courses")
    ) {
      return {
        tool: "listCourses",
        args: {},
      };
    }

    // 2. DELETE COURSE (Destructive - requires confirmation)
    if (
      (text.includes("delete course") || text.includes("course delete") || text.includes("remove course")) &&
      !text.includes("lecture")
    ) {
      const titleMatch = prompt.match(/(?:course|naam|called|named)\s+["']?([^"']+)["']?/i);
      const title = titleMatch ? titleMatch[1].replace(/delete|karo|please/gi, "").trim() : "";

      return {
        tool: "deleteCourse",
        requiresConfirmation: true,
        confirmationMessage: `Are you sure you want to permanently delete "${title || "this course"}" and all its lectures? This cannot be undone.`,
        args: {
          title,
          courseId: currentCourseId,
        },
      };
    }

    // 3. DELETE LECTURE (Destructive - requires confirmation)
    if (text.includes("delete lecture") || text.includes("lecture delete") || text.includes("remove lecture")) {
      const match = prompt.match(/(?:lecture|naam|called|named)\s+["']?([^"']+)["']?/i);
      const lectureTitle = match ? match[1].replace(/delete|karo|please/gi, "").trim() : "";

      return {
        tool: "deleteLecture",
        requiresConfirmation: true,
        confirmationMessage: `Are you sure you want to delete lecture "${lectureTitle || "selected lecture"}"?`,
        args: {
          lectureTitle,
          courseId: currentCourseId,
        },
      };
    }

    // 4. PUBLISH / UNPUBLISH COURSE
    if (text.includes("publish") || text.includes("unpublish") || text.includes("live karo")) {
      const isUnpublish = text.includes("unpublish") || text.includes("draft");
      return {
        tool: "publishCourse",
        args: {
          courseId: currentCourseId,
          isPublished: !isUnpublish,
        },
      };
    }

    // 5. COMPOUND: CREATE COURSE WITH MULTIPLE LECTURES
    // Example: "English Full Course banao aur usme Introduction, Grammar Basics aur Speaking Practice ke teen lectures add karo"
    if (
      (text.includes("banao") || text.includes("create")) &&
      text.includes("course") &&
      (text.includes("lecture") || text.includes("lectures"))
    ) {
      // Extract Course Title
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

      // Extract Lecture Titles
      const lectureTitles = [];
      const parts = prompt.split(/(?:lectures?|aur|and|,)/i);
      for (const part of parts) {
        const cleaned = part.replace(/ke teen|ke|three|banao|add karo|add|course|mein|usme/gi, "").trim();
        if (cleaned.length > 2 && cleaned.length < 50 && !cleaned.toLowerCase().includes(courseTitle.toLowerCase())) {
          lectureTitles.push(cleaned);
        }
      }

      return {
        tool: "compoundCreateCourseAndLectures",
        args: {
          title: courseTitle,
          lectureTitles: lectureTitles.length > 0 ? lectureTitles.slice(0, 5) : ["Introduction", "Core Concepts", "Practice & Application"],
        },
      };
    }

    // 6. ADD LECTURE TO AN EXISTING OR CURRENT COURSE
    // Example: "English Full Course mein ek lecture banao, naam Introduction to English"
    // Or: "Add a lecture called Grammar Basics"
    if (text.includes("lecture") && (text.includes("add") || text.includes("banao") || text.includes("create") || text.includes("dalo"))) {
      let lectureTitle = "New Lecture";
      let courseTitle = "";

      // Try extract lecture title
      const lectureMatch = prompt.match(/(?:lecture|naam|called|named|title)\s+["']?([^"'\n,]+?)["']?(?:\s+(?:rakhna|add|hai)|$)/i);
      if (lectureMatch && lectureMatch[1]) {
        lectureTitle = lectureMatch[1].replace(/banao|add karo|mein|dalo/gi, "").trim();
      }

      // Try extract course target
      const courseMatch = prompt.match(/([^"'\n]+?)\s+(?:mein|in)\s+(?:ek\s+)?lecture/i);
      if (courseMatch && courseMatch[1]) {
        courseTitle = courseMatch[1].trim();
      }

      return {
        tool: "createLecture",
        args: {
          courseId: currentCourseId,
          courseTitle,
          lectureTitle,
        },
      };
    }

    // 7. GENERATE COMPLETE COURSE OUTLINE / PLAN
    if (text.includes("generate") || text.includes("outline") || text.includes("curriculum") || text.includes("syllabus")) {
      const topicMatch = prompt.match(/(?:for|about|on|ka)\s+["']?([^"']+)["']?/i);
      const topic = topicMatch ? topicMatch[1].trim() : "General";

      return {
        tool: "generateCoursePlan",
        args: {
          topic,
          lectureCount: 5,
        },
      };
    }

    // 8. CREATE STANDALONE COURSE
    // Example: "Ek course banao jiska naam English Full Course hai"
    // Example: "Create a course called Physics Mechanics"
    if (text.includes("course") && (text.includes("banao") || text.includes("create") || text.includes("new"))) {
      let title = "New Course";
      const titleMatch = prompt.match(/(?:jiska naam|named|called|naam)\s+["']?([^"'\n]+?)["']?(?:\s+(?:hai|rakhna)|$)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      } else {
        const simpleMatch = prompt.match(/(?:create|banao|new)\s+(?:a\s+)?(?:course\s+)?["']?([^"'\n]+?)["']?(?:\s+(?:course|hai)|$)/i);
        if (simpleMatch && simpleMatch[1]) {
          title = simpleMatch[1].trim();
        }
      }

      title = title.replace(/^course\s+/i, "").replace(/\s+course$/i, "").trim() + " Course";

      return {
        tool: "createCourse",
        args: {
          title,
          category: text.includes("english") ? "English" : text.includes("physics") ? "Physics" : "General",
          description: `A comprehensive course covering foundational concepts, practical lessons, and study materials.`,
        },
      };
    }

    // Default Fallback: Ask for clarification
    return {
      tool: "clarify",
      args: { prompt },
    };
  },

  /**
   * Execute the resolved plan against authoritative backend services.
   */
  async executeToolPlan({ plan, tenantId, userId, userRole }) {
    const { tool, args } = plan;

    // 1. LIST COURSES
    if (tool === "listCourses") {
      const courses = await courseService.listCreatorCourses({ tenantId, userId });
      if (courses.length === 0) {
        return {
          message: "You haven't created any courses in this academy yet. Would you like me to create one?",
          data: { courses: [] },
        };
      }
      return {
        message: `You currently have ${courses.length} courses: ${courses.map((c) => `"${c.title}" (${c.isPublished ? "Published" : "Draft"})`).join(", ")}.`,
        data: { courses },
      };
    }

    // 2. CREATE COURSE
    if (tool === "createCourse") {
      // Check for duplicate course to prevent accidental clutter
      const existing = await courseService.findCourseByTitle({ tenantId, userId, title: args.title });
      if (existing) {
        return {
          message: `You already have a course named "${existing.title}". Would you like to add lectures to it or open its Course Studio?`,
          data: { course: existing, isDuplicate: true },
        };
      }

      const course = await courseService.createCourse({
        tenantId,
        userId,
        title: args.title,
        category: args.category || "General",
        description: args.description || `A structured curriculum built for student success.`,
        isPublished: false, // Default to draft for safety
      });

      return {
        message: `"${course.title}" course create kar diya hai (saved as Draft). You can now add lectures, notes, or customize pricing.`,
        data: { course },
      };
    }

    // 3. CREATE LECTURE
    if (tool === "createLecture") {
      let targetCourse = null;

      if (args.courseId) {
        targetCourse = await courseService.getCourse({ tenantId, courseId: args.courseId });
      } else if (args.courseTitle) {
        targetCourse = await courseService.findCourseByTitle({ tenantId, userId, title: args.courseTitle });
      } else {
        // Fallback to most recently updated course
        const courses = await courseService.listCreatorCourses({ tenantId, userId });
        if (courses.length > 0) targetCourse = courses[0];
      }

      if (!targetCourse) {
        throw new Error("Could not find the target course. Please specify which course to add this lecture to.");
      }

      const result = await lectureService.createLecture({
        tenantId,
        userId,
        userRole,
        courseId: targetCourse._id,
        lectureTitle: args.lectureTitle || "New Lecture",
      });

      return {
        message: `Lecture "${result.lecture.lectureTitle}" add ho gaya hai "${targetCourse.title}" mein.`,
        data: {
          courseId: targetCourse._id,
          lecture: result.lecture,
        },
      };
    }

    // 4. COMPOUND CREATE COURSE + LECTURES
    if (tool === "compoundCreateCourseAndLectures") {
      let course = await courseService.findCourseByTitle({ tenantId, userId, title: args.title });
      let isNew = false;

      if (!course) {
        course = await courseService.createCourse({
          tenantId,
          userId,
          title: args.title,
          category: args.title.toLowerCase().includes("english") ? "English" : "General",
          isPublished: false,
        });
        isNew = true;
      }

      const createdLectures = [];
      for (const lecTitle of args.lectureTitles || []) {
        if (lecTitle && lecTitle.trim()) {
          const lecRes = await lectureService.createLecture({
            tenantId,
            userId,
            userRole,
            courseId: course._id,
            lectureTitle: lecTitle.trim(),
          });
          createdLectures.push(lecRes.lecture);
        }
      }

      return {
        message: isNew
          ? `"${course.title}" course create kar diya hai aur usme ${createdLectures.length} lectures (${createdLectures.map((l) => l.lectureTitle).join(", ")}) add kar diye hain.`
          : `"${course.title}" course mein ${createdLectures.length} lectures add kar diye hain.`,
        data: {
          course,
          lectures: createdLectures,
        },
      };
    }

    // 5. DELETE COURSE
    if (tool === "deleteCourse") {
      let targetCourse = null;
      if (args.courseId) {
        targetCourse = await courseService.getCourse({ tenantId, courseId: args.courseId });
      } else if (args.title) {
        targetCourse = await courseService.findCourseByTitle({ tenantId, userId, title: args.title });
      }

      if (!targetCourse) {
        throw new Error(`Course "${args.title || ""}" not found.`);
      }

      await courseService.deleteCourse({
        tenantId,
        userId,
        userRole,
        courseId: targetCourse._id,
      });

      return {
        message: `Course "${targetCourse.title}" has been permanently removed.`,
        data: { deletedCourseId: targetCourse._id },
      };
    }

    // 6. DELETE LECTURE
    if (tool === "deleteLecture") {
      let targetLecture = null;
      if (args.lectureId) {
        targetLecture = await lectureService.getLecture({ tenantId, lectureId: args.lectureId });
      } else if (args.courseId && args.lectureTitle) {
        const course = await courseService.getCourse({ tenantId, courseId: args.courseId });
        if (course && course.lectures) {
          targetLecture = course.lectures.find(
            (l) => l.lectureTitle?.toLowerCase().includes(args.lectureTitle.toLowerCase())
          );
        }
      }

      if (!targetLecture) {
        throw new Error(`Lecture "${args.lectureTitle || ""}" could not be located.`);
      }

      await lectureService.deleteLecture({
        tenantId,
        userId,
        userRole,
        lectureId: targetLecture._id,
      });

      return {
        message: `Lecture "${targetLecture.lectureTitle}" has been deleted.`,
        data: { deletedLectureId: targetLecture._id },
      };
    }

    // 7. PUBLISH / UNPUBLISH COURSE
    if (tool === "publishCourse") {
      if (!args.courseId) {
        throw new Error("Please specify which course you would like to publish or unpublish.");
      }

      const updated = await courseService.setPublishStatus({
        tenantId,
        userId,
        userRole,
        courseId: args.courseId,
        isPublished: args.isPublished,
      });

      return {
        message: args.isPublished
          ? `"${updated.title}" is now published and visible to students in your academy catalog!`
          : `"${updated.title}" has been moved to Draft and is hidden from public students.`,
        data: { course: updated },
      };
    }

    // 8. GENERATE COURSE PLAN
    if (tool === "generateCoursePlan") {
      const topic = args.topic || "English Speaking";
      let plan = null;

      // Try external LLM API if key is configured (Gemini or OpenAI)
      const geminiKey = process.env.GEMINI_API_KEY || (process.env.AI_API_KEY?.startsWith("AIza") ? process.env.AI_API_KEY : null);
      const openaiKey = process.env.OPENAI_API_KEY || (process.env.AI_API_KEY?.startsWith("sk-") ? process.env.AI_API_KEY : null);

      if (geminiKey) {
        try {
          const prompt = `Return a JSON object for a structured online course on "${topic}". Output ONLY JSON: {"title": "...", "description": "...", "lectures": [{"title": "..."}, {"title": "..."}, {"title": "..."}, {"title": "..."}, {"title": "..."}]}`;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.title && Array.isArray(parsed.lectures)) {
                plan = {
                  title: parsed.title,
                  description: parsed.description || `Comprehensive course on ${topic}`,
                  lectures: parsed.lectures.map((l, i) => ({
                    title: typeof l === "string" ? l : (l.title || `Lesson ${i + 1}`),
                    preview: i === 0
                  }))
                };
              }
            }
          }
        } catch (e) {
          console.warn("[Gemini API]", e.message);
        }
      } else if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey.trim()}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are an educator assistant. Output only JSON in the shape: {\"title\": \"...\", \"description\": \"...\", \"lectures\": [{\"title\": \"...\"}]}" },
                { role: "user", content: `Generate a course plan for: ${topic}` }
              ],
              response_format: { type: "json_object" }
            })
          });
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              if (parsed.title && Array.isArray(parsed.lectures)) {
                plan = {
                  title: parsed.title,
                  description: parsed.description || `Comprehensive course on ${topic}`,
                  lectures: parsed.lectures.map((l, i) => ({
                    title: typeof l === "string" ? l : (l.title || `Lesson ${i + 1}`),
                    preview: i === 0
                  }))
                };
              }
            }
          }
        } catch (e) {
          console.warn("[OpenAI API]", e.message);
        }
      }

      // Default high-quality structured curriculum fallback
      if (!plan) {
        plan = {
          title: `${topic} Masterclass`,
          description: `A step-by-step curriculum designed to build practical mastery of ${topic}.`,
          lectures: [
            { title: `1. Introduction to ${topic}`, preview: true },
            { title: `2. Core Principles & Fundamentals`, preview: false },
            { title: `3. Practical Drills & Common Mistakes`, preview: false },
            { title: `4. Advanced Techniques & Scenarios`, preview: false },
            { title: `5. Final Project & Next Steps`, preview: false },
          ],
        };
      }

      return {
        message: `Here is a structured course outline for "${topic}". Would you like me to create this course with these draft lectures?`,
        data: { plan },
      };
    }

    // Clarification fallback
    return {
      message: "I understand. You can tell me to create a course (e.g. 'Ek English course banao'), add lectures (e.g. 'Add lecture Introduction'), or show your courses.",
      data: null,
    };
  },
};
