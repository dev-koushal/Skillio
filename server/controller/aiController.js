import { aiService } from "../services/aiService.js";
import AIActionLog from "../models/aiActionLogModel.js";
import multer from "multer";

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

export const voiceUploadMiddleware = memoryUpload.single("audio");

/**
 * AI Voice Command Controller for Educators (Whisper speech-to-text + Tool Execution).
 */
export const handleAIVoice = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;
    const currentCourseId = req.body.currentCourseId || null;
    const currentRoute = req.body.currentRoute || null;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No audio stream or recording received.",
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is missing in server environment for Whisper speech transcription.",
      });
    }

    const audioBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "audio/webm",
    });

    const formData = new FormData();
    formData.append("file", audioBlob, "voice_input.webm");
    formData.append("model", "whisper-1");
    formData.append(
      "prompt",
      "Educator creating LMS courses, lectures, modules, and notes in Hindi, English, and Hinglish. Commands: Ek course banao, add lecture, publish course."
    );

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const whisperData = await whisperResponse.json();

    if (whisperData.error) {
      console.error("[Whisper Transcription Error]", whisperData.error);
      return res.status(500).json({
        success: false,
        message: whisperData.error.message || "Failed to transcribe audio",
      });
    }

    const transcribedPrompt = whisperData.text?.trim();

    if (!transcribedPrompt) {
      return res.status(200).json({
        success: true,
        transcription: "",
        response: "I couldn't hear any clear speech. Please speak closely into your microphone and try again.",
        action: "NONE",
      });
    }

    console.log(`[AI Voice Command] Transcribed text: "${transcribedPrompt}"`);

    // Process the transcribed prompt through authorized AI tool service
    const result = await aiService.processCommand({
      tenantId,
      userId,
      userRole,
      prompt: transcribedPrompt,
      currentCourseId,
      currentRoute,
      confirmed: false,
    });

    return res.status(200).json({
      ...result,
      transcription: transcribedPrompt,
    });
  } catch (error) {
    console.error("[handleAIVoice Error]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process audio recording",
    });
  }
};

/**
 * AI Assistant Controller for Educators.
 */
export const handleAIChat = async (req, res) => {
  try {
    const { prompt, currentCourseId, currentRoute, confirmed, confirmationAction, messagesHistory } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!prompt && !confirmed) {
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
      currentRoute,
      confirmed: Boolean(confirmed),
      confirmationAction,
      messagesHistory: Array.isArray(messagesHistory) ? messagesHistory : [],
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[handleAIChat Error]", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
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

