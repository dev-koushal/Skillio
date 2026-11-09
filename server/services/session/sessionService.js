import crypto from "crypto";
import Session from "../../models/sessionModel.js";

const DEFAULT_MAX_ACTIVE_SESSIONS = 2;
const SESSION_TTL_DAYS = 14;

/**
 * Server-side session management service.
 * Enforces maximum 2 active device sessions per user across all physical devices/browsers.
 * Third login automatically revokes the oldest active session.
 */
class SessionService {
  constructor() {
    this.maxActiveSessions = Number(process.env.MAX_ACTIVE_SESSIONS) || DEFAULT_MAX_ACTIVE_SESSIONS;
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    if (process.env.REDIS_URL) {
      try {
        const redisMod = await import("ioredis");
        const Redis = redisMod.default || redisMod;
        this.redisClient = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        await this.redisClient.connect();
        console.log("[SessionService] Redis session layer connected successfully.");
      } catch (err) {
        console.warn("[SessionService] Redis initialization skipped, using MongoDB session store:", err.message);
        this.redisClient = null;
      }
    }
  }

  /**
   * Register a new active session for a user.
   * If the user already has >= 2 active sessions, the oldest active session is revoked.
   *
   * @param {Object} params
   * @param {string|ObjectId} params.userId
   * @param {string} [params.userAgent]
   * @param {string} [params.ipAddress]
   * @param {string} [params.deviceId]
   * @returns {Promise<{ sessionId: string, deviceId: string }>}
   */
  async createSession({ userId, userAgent = "", ipAddress = "", deviceId = null }) {
    const sessionId = crypto.randomUUID();
    const resolvedDeviceId = deviceId || crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    // 1. Fetch current active sessions for user, sorted oldest first
    const activeSessions = await Session.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });

    const maxLimit = Number(process.env.MAX_ACTIVE_SESSIONS) || this.maxActiveSessions;

    // 2. If at or above max active sessions, revoke the oldest active session(s)
    if (activeSessions.length >= maxLimit) {
      const excessCount = activeSessions.length - maxLimit + 1;
      const sessionsToRevoke = activeSessions.slice(0, excessCount);

      for (const s of sessionsToRevoke) {
        s.revokedAt = new Date();
        await s.save();

        if (this.redisClient) {
          try {
            await this.redisClient.hset(`session:${s.sessionId}`, "revokedAt", s.revokedAt.toISOString());
            await this.redisClient.srem(`user:${userId}:sessions`, s.sessionId);
          } catch (e) {}
        }
      }
    }

    // 3. Create and persist new session
    const newSession = await Session.create({
      sessionId,
      userId,
      deviceId: resolvedDeviceId,
      userAgent: userAgent ? userAgent.substring(0, 256) : "Browser",
      ipAddress: ipAddress ? ipAddress.substring(0, 64) : "",
      createdAt: new Date(),
      lastSeenAt: new Date(),
      revokedAt: null,
      expiresAt,
    });

    // 4. Mirror in Redis if available
    if (this.redisClient) {
      try {
        const sessionKey = `session:${sessionId}`;
        await this.redisClient.hset(sessionKey, {
          sessionId,
          userId: userId.toString(),
          deviceId: resolvedDeviceId,
          createdAt: newSession.createdAt.toISOString(),
          lastSeenAt: newSession.lastSeenAt.toISOString(),
          revokedAt: "",
        });
        await this.redisClient.expire(sessionKey, SESSION_TTL_DAYS * 24 * 60 * 60);
        await this.redisClient.sadd(`user:${userId}:sessions`, sessionId);
      } catch (e) {}
    }

    return { sessionId, deviceId: resolvedDeviceId };
  }

  /**
   * Validate whether a session is currently active and unrevoked.
   *
   * @param {string|ObjectId} userId
   * @param {string} sessionId
   * @returns {Promise<{ isValid: boolean, isRevoked: boolean, reason?: string, session?: Object }>}
   */
  async validateSession(userId, sessionId) {
    if (!sessionId) {
      return { isValid: false, isRevoked: true, reason: "No session identifier provided" };
    }

    // Try Redis lookup first if available
    if (this.redisClient) {
      try {
        const redisData = await this.redisClient.hgetall(`session:${sessionId}`);
        if (redisData && redisData.sessionId) {
          if (redisData.revokedAt) {
            return { isValid: false, isRevoked: true, reason: "Session revoked" };
          }
          if (redisData.userId !== userId.toString()) {
            return { isValid: false, isRevoked: true, reason: "Session user mismatch" };
          }
          return { isValid: true, isRevoked: false };
        }
      } catch (e) {}
    }

    // Database lookup
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return { isValid: false, isRevoked: true, reason: "Session not found" };
    }

    if (session.userId.toString() !== userId.toString()) {
      return { isValid: false, isRevoked: true, reason: "Session does not belong to user" };
    }

    if (session.revokedAt) {
      return { isValid: false, isRevoked: true, reason: "Session revoked on another device" };
    }

    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      return { isValid: false, isRevoked: true, reason: "Session expired" };
    }

    // Throttle heartbeat writes to MongoDB (at most once every 5 minutes)
    const elapsedSinceLastSeen = Date.now() - new Date(session.lastSeenAt).getTime();
    if (elapsedSinceLastSeen > 5 * 60 * 1000) {
      session.lastSeenAt = new Date();
      await session.save();
    }

    return { isValid: true, isRevoked: false, session };
  }

  /**
   * Revoke a single active session (used during normal device logout).
   *
   * @param {string|ObjectId} userId
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async revokeSession(userId, sessionId) {
    if (!sessionId) return false;

    const result = await Session.updateOne(
      { userId, sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    if (this.redisClient) {
      try {
        await this.redisClient.hset(`session:${sessionId}`, "revokedAt", new Date().toISOString());
        await this.redisClient.srem(`user:${userId}:sessions`, sessionId);
      } catch (e) {}
    }

    return result.modifiedCount > 0;
  }

  /**
   * List all currently active sessions for an account.
   *
   * @param {string|ObjectId} userId
   * @returns {Promise<Array>}
   */
  async getActiveSessions(userId) {
    const sessions = await Session.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("sessionId deviceId userAgent ipAddress createdAt lastSeenAt")
      .lean();

    return sessions;
  }
}

const sessionService = new SessionService();
export default sessionService;
