import { aiService } from "../services/aiService.js";
import AIActionLog from "../models/aiActionLogModel.js";

/**
 * AI Assistant Controller for Educators.
 */
export const handleAIChat = async (req, res) => {
  try {
    const { prompt, currentCourseId, confirmed } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        success: false,
        message: "Prompt string is required",
      });
    }

    const result = await aiService.processCommand({
      tenantId,
      userId,
      userRole,
      prompt,
      currentCourseId,
      confirmed: Boolean(confirmed),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[handleAIChat Error]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process AI assistant instruction",
    });
  }
};

/**
 * Generate course outline/plan for course builder.
 */
export const handleGeneratePlan = async (req, res) => {
  try {
    const { topic, level = "Beginner", lectureCount = 5 } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Topic is required" });
    }

    const cleanTopic = topic.trim();
    const count = Math.min(Math.max(Number(lectureCount) || 5, 3), 12);

    const defaultLectures = [
      { title: `1. Introduction to ${cleanTopic}`, preview: true, description: "Overview of core concepts, goals, and setup." },
      { title: `2. Foundational Principles & Rules`, preview: false, description: "Deep dive into essential building blocks and syntax." },
      { title: `3. Step-by-Step Hands-on Practice`, preview: false, description: "Practical exercises and guided problem solving." },
      { title: `4. Common Pitfalls & How to Avoid Them`, preview: false, description: "Best practices, common student mistakes, and fixes." },
      { title: `5. Advanced Application & Milestone Review`, preview: false, description: "Real-world project and next steps for mastery." },
    ];

    const plan = {
      title: `${cleanTopic} Masterclass`,
      subTitle: `Comprehensive ${level.toLowerCase()} course to master ${cleanTopic} with confidence`,
      description: `In this structured course, students will learn ${cleanTopic} from scratch through step-by-step video lectures, downloadable notes, and practical milestone exercises.`,
      category: cleanTopic,
      level,
      lectures: defaultLectures.slice(0, count),
    };

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get AI action history logs for educator.
 */
export const getAILogs = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;

    const logs = await AIActionLog.find({ tenantId, userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
