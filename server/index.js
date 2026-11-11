import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Pre-register all Mongoose schemas
import "./models/index.js";

import { connectDB } from "./config/connectDB.js";
import { ensureDefaultTenants } from "./config/initTenants.js";
import { tenantResolver } from "./middleware/tenantResolver.js";
import standardizeAuthorizationResponses from "./middleware/standardizeAuthorizationResponses.js";

import authRouter from "./routes/authRoute.js";
import userRouter from "./routes/userRoute.js";
import courseRouter from "./routes/courseRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import tenantRouter from "./routes/tenantRoute.js";
import resourceRouter from "./routes/resourceRoute.js";
import aiRouter from "./routes/aiRoute.js";
import institutionStudentRouter from "./routes/institutionStudentRoute.js";
import invitationRouter from "./routes/invitationRoute.js";
import liveClassRouter from "./routes/liveClassRoute.js";
import { startYouTubeLiveSync } from "./services/youtubeLiveSync.js";
import { getLecturePlayback } from "./controller/courseController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (server/.env or root .env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Express Body & Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(standardizeAuthorizationResponses);

// Static folder for local uploads
app.use("/public", express.static(path.join(__dirname, "public")));

// Dynamic CORS configuration for multi-tenant subdomains
const allowedOriginRegex = /^(https?:\/\/([a-zA-Z0-9-]+\.)*(lvh\.me|localhost|mylms\.com|onrender\.com)(:[0-9]+)?)$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (
        allowedOriginRegex.test(origin) ||
        origin === "http://localhost:5173" ||
        origin === "http://localhost:3000" ||
        (process.env.ALLOWED_ORIGINS &&
          process.env.ALLOWED_ORIGINS.split(",").includes(origin))
      ) {
        return callback(null, true);
      }

      // In development, allow origin for developer ease
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Centralized Multi-Tenant Resolution Middleware
app.use(tenantResolver);

// Playback Authorization Route (Primary)
app.get("/api/lectures/:lectureId/playback", getLecturePlayback);

// API Routes
app.use("/api/institutions/me", institutionStudentRouter);
app.use("/api/tenant/me", institutionStudentRouter);
app.use("/api/tenant", tenantRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/course", courseRouter);
app.use("/api/order", paymentRouter);
app.use("/api/review", reviewRouter);
app.use("/api/resource", resourceRouter);
app.use("/api/ai", aiRouter);
app.use("/api/invitations", invitationRouter);
app.use("/api/institution/live", liveClassRouter);

// Serve static client assets in production
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(err.status || 500).json({
    success: false,
    code: err.status === 401 ? "UNAUTHENTICATED" : err.status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
    message: err.status === 401 ? "You need to sign in to continue." : err.status === 403 ? "You don't have permission to perform this action." : "Something went wrong. Please try again.",
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, async () => {
    console.log(`[Server] Listening at http://localhost:${PORT}`);
    try {
      await connectDB();
      await ensureDefaultTenants();
      startYouTubeLiveSync();
    } catch (error) {
      console.error("[Database] Initialization error:", error);
    }
  });
}

export default app;
