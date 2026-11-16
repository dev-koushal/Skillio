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
import noteRouter from "./routes/noteRoute.js";
import uploadRouter from "./routes/uploadRoute.js";
import { startYouTubeLiveSync } from "./services/youtubeLiveSync.js";
import { getLecturePlayback } from "./controller/courseController.js";
import { handleResourcePaymentWebhook } from "./controller/paidResourceController.js";
import { handleCloudinaryEagerNotification } from "./controller/resourceController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (server/.env or root .env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Razorpay requires the unmodified request bytes to validate webhook signatures.
app.post("/api/order/razorpay-webhook", express.raw({ type: "application/json", limit: "256kb" }), handleResourcePaymentWebhook);
app.post("/api/resource/cloudinary-eager-webhook", express.raw({ type: "application/json", limit: "256kb" }), handleCloudinaryEagerNotification);

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
app.use("/api/notes", noteRouter);
app.use("/api/upload", uploadRouter);

// Serve static client assets in production
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(__dirname, "../client/dist");

  // Dynamic self-healing service worker that forcefully clears browser caches and refreshes tabs
  app.get(["/sw.js", "/service-worker.js"], (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Clear-Site-Data", '"cache"');
    res.send(`
      self.addEventListener("install", (e) => self.skipWaiting());
      self.addEventListener("activate", (e) => {
        e.waitUntil(
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .then(() => self.registration.unregister())
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
            .then((clients) => {
              clients.forEach((c) => {
                try { c.navigate(c.url); } catch(err) {}
              });
            })
        );
      });
      self.addEventListener("fetch", (e) => {});
    `);
  });

  // Stale chunk auto-recovery: If an old browser with a cached index.html requests an obsolete chunk,
  // wipe caches and hard reload rather than crashing with ReferenceErrors or white screens.
  app.get(["/assets/CreateNote-C0ZX-ut2.js", "/assets/CreateNote-COZX-ut2.js", "/assets/index-DOCvl7yC.js", "/assets/index-DOcvL7yC.js", "/assets/index-DQcvL7yC.js", "/assets/index-DQCvl7yC.js"], (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Clear-Site-Data", '"cache", "storage"');
    res.send(`
      if (typeof window !== "undefined") {
        if ("caches" in window) {
          caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          }).then(function() {
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      }
      export default function() { return null; };
    `);
  });

  // Catch-all for any other obsolete .js asset chunk not present on disk
  app.get("/assets/:file", (req, res, next) => {
    const fileName = req.params.file;
    if (!fileName || !fileName.endsWith(".js")) return next();
    const diskPath = path.join(clientDistPath, "assets", fileName);
    if (fs.existsSync(diskPath)) return next();

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Clear-Site-Data", '"cache"');
    res.send(`
      console.warn("[Skillio] Obsolete chunk requested: ${fileName}. Evacuating stale cache and reloading...");
      if (typeof window !== "undefined") {
        if ("caches" in window) {
          caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
          }).then(function() {
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      }
      export default function() { return null; };
    `);
  });

  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
      }
    },
  }));

  // path-to-regexp v8 requires named wildcards. Use a RegExp here so this
  // SPA fallback matches the root path as well as nested client routes.
  app.get(/.*/, (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Clear-Site-Data", '"cache"');
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
