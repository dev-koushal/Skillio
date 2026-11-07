import { Router } from "express";
import {
  handleAIChat,
  handleGeneratePlan,
  getAILogs,
  handleAIVoice,
  voiceUploadMiddleware,
} from "../controller/aiController.js";
import isAuth from "../middleware/isAuth.js";
import { requireEducator } from "../middleware/rbac.js";

const aiRouter = Router();

// Strict Authentication and Role-Based Authorization
aiRouter.use(isAuth);
aiRouter.use(requireEducator);

aiRouter.post("/chat", handleAIChat);
aiRouter.post("/voice", voiceUploadMiddleware, handleAIVoice);
aiRouter.post("/plan", handleGeneratePlan);
aiRouter.get("/logs", getAILogs);

export default aiRouter;

