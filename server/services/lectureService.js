import fs from "fs";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Resource from "../models/resourceModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import bunnyVideoService from "./video/bunnyVideoService.js";
import { parseYouTubeVideoUrl } from "../utils/youtubeVideo.js";
import { canManageCourse } from "../utils/permissions.js";

/**
 * Service to manage lecture business logic.
 * Used by both normal REST controllers and the AI tool execution engine.
 */
export const lectureService = {
  /**
   * Create a new lecture inside a course.
   */
  async createLecture({
    tenantId,
    userId,
    userRole,
    courseId,
    lectureTitle,
    isPreviewFree = false,
    videoFile = null,
    videoUrl = null,
    videoProvider: requestedProvider = "",
    youtubeUrl = "",
    resourceData = null,
  }) {
    if (!lectureTitle || !lectureTitle.trim()) {
      throw new Error("Lecture title is required");
    }
    if (!courseId) {
      throw new Error("courseId is required");
    }

    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      throw new Error("Course not found in this organization");
    }

    // Verify ownership
    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("Not authorized to add lectures to this course");
    }

    let finalVideoUrl = videoUrl || "";
    let videoProvider = "cloudinary";
    let bunnyVideoId = "";
    let bunnyLibraryId = "";
    let processingStatus = "ready";
    let youtubeVideoId = "";
    let canonicalYoutubeUrl = "";

    if (requestedProvider === "youtube") {
      if (videoFile) throw new Error("Choose either an uploaded video or a YouTube video.");
      const parsed = parseYouTubeVideoUrl(youtubeUrl);
      videoProvider = "youtube";
      youtubeVideoId = parsed.videoId;
      canonicalYoutubeUrl = parsed.canonicalUrl;
      finalVideoUrl = "";
    }

    const isFree = isPreviewFree === "true" || isPreviewFree === true;
    const hasVideo = Boolean(videoFile && requestedProvider !== "youtube");

    const lecture = await Lecture.create({
      tenantId,
      courseId,
      lectureTitle: lectureTitle.trim(),
      isPreviewFree: isFree,
      videoUrl: finalVideoUrl,
      videoProvider,
      bunnyVideoId,
      bunnyLibraryId,
      youtubeVideoId,
      youtubeUrl: canonicalYoutubeUrl,
      processingStatus: hasVideo ? "processing" : "ready",
    });

    course.lectures.push(lecture._id);
    await course.save();

    const targetLectureId = lecture._id;

    if (hasVideo) {
      const filePath = videoFile.path;

      if (bunnyVideoService.isConfigured()) {
        try {
          const bunnyRes = await bunnyVideoService.createVideo(lectureTitle.trim());
          const bgVideoId = bunnyRes.videoId;
          await Lecture.findByIdAndUpdate(targetLectureId, {
            $set: {
              videoProvider: "bunny",
              bunnyVideoId: bgVideoId,
              bunnyLibraryId: bunnyRes.libraryId,
              processingStatus: "processing",
            },
          });

          // Upload in background and poll for transcoding completion
          setImmediate(async () => {
            try {
              await bunnyVideoService.uploadVideo(bgVideoId, filePath);
              try { await fs.promises.unlink(filePath); } catch {}

              // Active status check every 2 seconds for up to 60s
              let attempts = 0;
              const pollTimer = setInterval(async () => {
                attempts++;
                try {
                  const liveStatus = await bunnyVideoService.getVideoStatus(bgVideoId);
                  if (liveStatus === "ready") {
                    clearInterval(pollTimer);
                    await Lecture.findByIdAndUpdate(targetLectureId, {
                      $set: { processingStatus: "ready" },
                    });
                  } else if (liveStatus === "failed") {
                    clearInterval(pollTimer);
                    await Lecture.findByIdAndUpdate(targetLectureId, {
                      $set: { processingStatus: "failed" },
                    });
                  } else if (attempts >= 30) {
                    clearInterval(pollTimer);
                  }
                } catch (pollErr) {
                  clearInterval(pollTimer);
                }
              }, 2000);
            } catch (upErr) {
              console.error("[Bunny Background Upload Failed]", upErr.message);
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          });
        } catch (bErr) {
          console.warn("[Bunny Upload Failed, fallback to Cloudinary]", bErr.message);
          setImmediate(async () => {
            try {
              const uploaded = await uploadCloudinary(filePath);
              if (uploaded) {
                await Lecture.findByIdAndUpdate(targetLectureId, {
                  $set: { videoProvider: "cloudinary", videoUrl: uploaded, processingStatus: "ready" },
                });
              } else {
                await Lecture.findByIdAndUpdate(targetLectureId, {
                  $set: { processingStatus: "failed" },
                });
              }
            } catch (cErr) {
              console.error("[Background Cloudinary Upload Error]", cErr);
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          });
        }
      } else {
        // Cloudinary upload
        setImmediate(async () => {
          try {
            const uploaded = await uploadCloudinary(filePath);
            if (uploaded) {
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { videoProvider: "cloudinary", videoUrl: uploaded, processingStatus: "ready" },
              });
            } else {
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          } catch (cErr) {
            console.error("[Background Cloudinary Upload Error]", cErr);
            await Lecture.findByIdAndUpdate(targetLectureId, {
              $set: { processingStatus: "failed" },
            });
          }
        });
      }
    }

    // Attach optional study note / PDF resource if provided
    let attachedResource = null;
    if (resourceData?.title && resourceData?.fileUrl) {
      attachedResource = await Resource.create({
        tenantId,
        courseId,
        lectureId: lecture._id,
        title: resourceData.title.trim(),
        description: resourceData.description || "",
        type: resourceData.type || "pdf",
        fileUrl: resourceData.fileUrl,
        uploadedBy: userId,
      });
    }

    return { lecture, course, resource: attachedResource };
  },

  /**
   * Update lecture title, preview flag, or video.
   */
  async updateLecture({
    tenantId,
    userId,
    userRole,
    lectureId,
    lectureTitle,
    isPreviewFree,
    videoFile = null,
    videoUrl = null,
    videoProvider: requestedProvider = "",
    youtubeUrl = "",
  }) {
    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      throw new Error("Lecture not found in this organization");
    }

    const course = await Course.findOne({ _id: lecture.courseId, tenantId });
    if (course && !(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("Not authorized to modify this lecture");
    }

    if (requestedProvider === "youtube") {
      if (videoFile) throw new Error("Choose either an uploaded video or a YouTube video.");
      const parsed = parseYouTubeVideoUrl(youtubeUrl);
      lecture.videoProvider = "youtube";
      lecture.youtubeVideoId = parsed.videoId;
      lecture.youtubeUrl = parsed.canonicalUrl;
      lecture.videoUrl = "";
      lecture.bunnyVideoId = "";
      lecture.bunnyLibraryId = "";
      lecture.bunnyDirectUrl = "";
      lecture.processingStatus = "ready";
    } else if (videoFile) {
      if (bunnyVideoService.isConfigured()) {
        try {
          const title = lectureTitle ? lectureTitle.trim() : lecture.lectureTitle;
          const bunnyRes = await bunnyVideoService.createVideo(title);
          lecture.videoProvider = "bunny";
          lecture.bunnyVideoId = bunnyRes.videoId;
          lecture.bunnyLibraryId = bunnyRes.libraryId;
          lecture.bunnyDirectUrl = "";
          lecture.videoUrl = "";
          lecture.youtubeVideoId = "";
          lecture.youtubeUrl = "";
          lecture.processingStatus = "processing";

          const filePath = videoFile.path;
          const bgVideoId = bunnyRes.videoId;
          const targetLectureId = lecture._id;

          setImmediate(async () => {
            try {
              await bunnyVideoService.uploadVideo(bgVideoId, filePath);
              try { await fs.promises.unlink(filePath); } catch {}

              let attempts = 0;
              const pollTimer = setInterval(async () => {
                attempts++;
                try {
                  const liveStatus = await bunnyVideoService.getVideoStatus(bgVideoId);
                  if (liveStatus === "ready") {
                    clearInterval(pollTimer);
                    await Lecture.findByIdAndUpdate(targetLectureId, {
                      $set: { processingStatus: "ready" },
                    });
                  } else if (liveStatus === "failed") {
                    clearInterval(pollTimer);
                    await Lecture.findByIdAndUpdate(targetLectureId, {
                      $set: { processingStatus: "failed" },
                    });
                  } else if (attempts >= 30) {
                    clearInterval(pollTimer);
                  }
                } catch (pollErr) {
                  clearInterval(pollTimer);
                }
              }, 2000);
            } catch (upErr) {
              console.error("[Bunny Background Upload Failed]", upErr.message);
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          });
        } catch (bErr) {
          lecture.videoProvider = "cloudinary";
          lecture.bunnyVideoId = "";
          lecture.bunnyLibraryId = "";
          lecture.bunnyDirectUrl = "";
          lecture.youtubeVideoId = "";
          lecture.youtubeUrl = "";
          lecture.processingStatus = "processing";
          const filePath = videoFile.path;
          const targetLectureId = lecture._id;
          setImmediate(async () => {
            try {
              const uploaded = await uploadCloudinary(filePath);
              if (uploaded) {
                await Lecture.findByIdAndUpdate(targetLectureId, {
                  $set: { videoUrl: uploaded, processingStatus: "ready" },
                });
              } else {
                await Lecture.findByIdAndUpdate(targetLectureId, {
                  $set: { processingStatus: "failed" },
                });
              }
            } catch (cErr) {
              console.error("[Background Cloudinary Video Edit Error]", cErr);
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          });
        }
      } else {
        lecture.videoProvider = "cloudinary";
        lecture.bunnyVideoId = "";
        lecture.bunnyLibraryId = "";
        lecture.bunnyDirectUrl = "";
        lecture.youtubeVideoId = "";
        lecture.youtubeUrl = "";
        lecture.processingStatus = "processing";
        const filePath = videoFile.path;
        const targetLectureId = lecture._id;
        setImmediate(async () => {
          try {
            const uploaded = await uploadCloudinary(filePath);
            if (uploaded) {
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { videoUrl: uploaded, processingStatus: "ready" },
              });
            } else {
              await Lecture.findByIdAndUpdate(targetLectureId, {
                $set: { processingStatus: "failed" },
              });
            }
          } catch (cErr) {
            console.error("[Background Cloudinary Video Edit Error]", cErr);
            await Lecture.findByIdAndUpdate(targetLectureId, {
              $set: { processingStatus: "failed" },
            });
          }
        });
      }
    } else if (["bunny", "cloudinary"].includes(requestedProvider)) {
      throw new Error("Select a video file to replace the current source.");
    } else if (typeof videoUrl !== "undefined" && videoUrl !== null) {
      // Retained for trusted legacy service callers; public controllers do not accept raw URLs.
      lecture.videoUrl = videoUrl;
    }

    if (typeof lectureTitle !== "undefined") {
      lecture.lectureTitle = lectureTitle.trim();
    }

    if (typeof isPreviewFree !== "undefined") {
      lecture.isPreviewFree = isPreviewFree === "true" || isPreviewFree === true;
    }

    await lecture.save();
    return lecture;
  },

  /**
   * Get single lecture.
   */
  async getLecture({ tenantId, lectureId }) {
    return Lecture.findOne({ _id: lectureId, tenantId });
  },

  /**
   * Find lecture by title within a course.
   */
  async findLectureByTitle({ tenantId, courseId, title }) {
    if (!title) return null;
    return Lecture.findOne({
      tenantId,
      courseId,
      lectureTitle: { $regex: new RegExp(title.trim(), "i") },
    });
  },

  /**
   * Delete a lecture and cleanup course reference and resources.
   */
  async deleteLecture({ tenantId, userId, userRole, lectureId }) {
    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      throw new Error("Lecture not found");
    }

    const course = await Course.findOne({ _id: lecture.courseId, tenantId });
    if (course && !(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("Not authorized to delete this lecture");
    }

    // Delete associated resources
    await Resource.deleteMany({ lectureId, tenantId });

    // Remove lecture from course array
    await Course.updateOne(
      { _id: lecture.courseId, tenantId },
      { $pull: { lectures: lectureId } }
    );

    await Lecture.deleteOne({ _id: lectureId, tenantId });

    return { success: true, deletedLectureId: lectureId, lectureTitle: lecture.lectureTitle };
  },
};

