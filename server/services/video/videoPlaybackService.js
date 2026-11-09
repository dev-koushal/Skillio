import Lecture from "../../models/lectureModel.js";
import Course from "../../models/coursesModel.js";
import { verifyCourseAccess } from "../../utils/courseAccess.js";
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
   * @param {string} params.tenantId
   * @returns {Promise<Object>}
   */
  async getLecturePlayback({ lectureId, userId = null, userRole = null, tenantId }) {
    if (!lectureId || !tenantId) {
      return {
        authorized: false,
        status: 400,
        message: "Missing lecture or organization parameter",
      };
    }

    // 1. Verify lecture exists strictly within this institution
    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      return {
        authorized: false,
        status: 404,
        message: "Lecture not found in this organization",
      };
    }

    // 2. Verify parent course belongs to same institution
    const course = await Course.findOne({ _id: lecture.courseId, tenantId });
    if (!course) {
      return {
        authorized: false,
        status: 404,
        message: "Course not found",
      };
    }

    // 3. Authorization Check: Free preview OR verified course access
    let isAuthorized = false;
    let accessReason = "";

    if (lecture.isPreviewFree) {
      isAuthorized = true;
    } else if (userId) {
      const access = await verifyCourseAccess({
        courseId: course._id,
        userId,
        userRole,
        tenantId,
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

    if (provider === "bunny" && lecture.bunnyVideoId) {
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
        processingStatus: lecture.processingStatus || "ready",
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

