import mongoose from "mongoose";
import Lecture from "../../models/lectureModel.js";
import Course from "../../models/coursesModel.js";
import { verifyCourseAccess } from "../../utils/courseAccess.js";
import { isInstitutionOwner, normalizeRole } from "../../utils/permissions.js";
import bunnyVideoService from "./bunnyVideoService.js";

/**
 * Playback Authorization Service.
 * Authenticates user, verifies tenant context and course enrollment,
 * and issues short-lived tokenized video playback authorization.
 */
class VideoPlaybackService {
  /**
   * Authorize and generate playback credentials for a specific lecture.
   *
   * @param {Object} params
   * @param {string} params.lectureId
   * @param {string} [params.userId]
   * @param {string} [params.userRole]
   * @param {string} [params.tenantId]
   * @returns {Promise<Object>}
   */
  async getLecturePlayback({ lectureId, userId = null, userRole = null, tenantId = null }) {
    if (!lectureId || !mongoose.Types.ObjectId.isValid(lectureId)) {
      return {
        authorized: false,
        status: 400,
        message: "Missing or invalid lecture parameter",
      };
    }

    // 1. Verify lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return {
        authorized: false,
        status: 404,
        message: "Lecture not found",
      };
    }

    // 2. Verify parent course exists
    if (!lecture.courseId || !mongoose.Types.ObjectId.isValid(lecture.courseId)) {
      return {
        authorized: false,
        status: 404,
        message: "Course not found",
      };
    }

    const course = await Course.findById(lecture.courseId);
    if (!course) {
      return {
        authorized: false,
        status: 404,
        message: "Course not found",
      };
    }

    const courseTenantId = course.tenantId || lecture.tenantId || tenantId;
    const normalizedRole = normalizeRole(userRole);

    // 3. Creator or Admin check: Course builder can ALWAYS view their own course!
    const isCreator = Boolean(
      userId && (
        (course.creator && course.creator.toString() === userId.toString()) ||
        (lecture.creator && lecture.creator.toString() === userId.toString())
      )
    );
    const isAdmin = Boolean(
      userId && courseTenantId && (await isInstitutionOwner({ tenantId: courseTenantId, userId, userRole: normalizedRole }))
    );

    // 4. Authorization Check: Creator/Admin OR Free preview OR verified course access
    let isAuthorized = false;
    let accessReason = "";

    if (isCreator || isAdmin) {
      isAuthorized = true;
    } else if (lecture.isPreviewFree) {
      isAuthorized = true;
    } else if (userId) {
      const access = await verifyCourseAccess({
        courseId: course._id,
        userId,
        userRole: normalizedRole,
        tenantId: courseTenantId,
      });

      if (access.hasAccess) {
        isAuthorized = true;
      } else {
        accessReason = access.reason || "Payment or enrollment required";
      }
    } else {
      accessReason = "Sign in to access this lecture";
    }

    if (!isAuthorized) {
      return {
        authorized: false,
        status: 403,
        message: accessReason,
        isPreviewFree: Boolean(lecture.isPreviewFree),
      };
    }

    // 4. Generate Short-Lived Authorized Playback
    const provider = lecture.videoProvider || "cloudinary";

    if (provider === "youtube") {
      if (!lecture.youtubeVideoId) {
        return { authorized: false, status: 422, message: "This lecture's YouTube source is unavailable." };
      }
      return {
        authorized: true,
        status: 200,
        videoProvider: "youtube",
        playbackType: "youtube_embed",
        youtubeVideoId: lecture.youtubeVideoId,
        duration: lecture.duration || 0,
        lectureTitle: lecture.lectureTitle,
        isPreviewFree: Boolean(lecture.isPreviewFree),
        processingStatus: "ready",
      };
    }

    if (provider === "bunny" && lecture.bunnyVideoId) {
      let currentStatus = lecture.processingStatus || "ready";
      if (currentStatus === "processing" || currentStatus === "uploading") {
        try {
          const liveStatus = await bunnyVideoService.getVideoStatus(lecture.bunnyVideoId);
          if (liveStatus && liveStatus !== currentStatus) {
            currentStatus = liveStatus;
            await Lecture.updateOne({ _id: lecture._id }, { $set: { processingStatus: liveStatus } });
          }
        } catch (err) {
          console.warn("[VideoPlaybackService] Error checking live Bunny video status:", err.message);
        }
      }

      const tokenData = bunnyVideoService.generatePlaybackToken({
        videoId: lecture.bunnyVideoId,
        libraryId: lecture.bunnyLibraryId,
      });

      return {
        authorized: true,
        status: 200,
        videoProvider: "bunny",
        playbackType: "bunny_stream",
        embedUrl: tokenData.embedUrl,
        hlsUrl: tokenData.hlsUrl,
        expiresAt: tokenData.expiresAt,
        duration: lecture.duration || 0,
        lectureTitle: lecture.lectureTitle,
        isPreviewFree: Boolean(lecture.isPreviewFree),
        processingStatus: currentStatus,
      };
    }

    // Legacy Cloudinary / Direct Playback Path with short-lived session authorization
    const ttlSeconds = Number(process.env.VIDEO_PLAYBACK_TOKEN_TTL) || 300;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    return {
      authorized: true,
      status: 200,
      videoProvider: "cloudinary",
      playbackType: "direct",
      streamUrl: lecture.videoUrl || "",
      expiresAt,
      duration: lecture.duration || 0,
      lectureTitle: lecture.lectureTitle,
      isPreviewFree: Boolean(lecture.isPreviewFree),
      processingStatus: "ready",
    };
  }
}

const videoPlaybackService = new VideoPlaybackService();
export default videoPlaybackService;

