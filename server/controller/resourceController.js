import Resource from "../models/resourceModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import uploadCloudinary from "../config/cloudinary.js";
import { verifyCourseAccess } from "../utils/courseAccess.js";
import fs from "fs";
import path from "path";
import { canManageCourse } from "../utils/permissions.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import ResourceEntitlement from "../models/resourceEntitlementModel.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import Note from "../models/noteModel.js";
import {
  fetchProtectedPdfPage,
  inspectProtectedPdf,
  uploadProtectedPdf,
} from "../services/protectedPdf.js";
import { completeNotePdfProcessing } from "../services/noteProcessing.js";

/**
 * Upload a new resource (either course-level or associated with a specific lecture)
 */
export const uploadResource = async (req, res) => {
  try {
    const { courseId, lectureId, title, description, topic, type } = req.body;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!courseId || typeof title !== "string" || !title.trim() || title.length > 180) {
      return res.status(400).json({ success: false, message: "courseId and title are required" });
    }

    // Tenant-isolated course lookup & ownership check
    const course = await Course.findOne({ _id: courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }

    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      return res.status(403).json({ success: false, message: "Not authorized to upload resources to this course" });
    }

    // Verify lecture belongs to this course if lectureId provided
    if (lectureId) {
      const lecture = await Lecture.findOne({ _id: lectureId, courseId, tenantId });
      if (!lecture) {
        return res.status(404).json({ success: false, message: "Specified lecture not found in this course" });
      }
    }
    if (req.body.referenceLectureId) {
      const referenceLecture = await Lecture.findOne({ _id: req.body.referenceLectureId, courseId, tenantId }).select("_id videoProvider bunnyVideoId youtubeVideoId");
      if (!referenceLecture) return res.status(404).json({ success: false, message: "Reference video must be a lecture in this course." });
      req.referenceLecture = referenceLecture;
    }

    const accessType = ["free", "paid"].includes(req.body.accessType) ? req.body.accessType : "standard";
    if (req.securePdfUpload && accessType === "standard") return res.status(400).json({ success: false, message: "Choose free or paid secure notes." });
    if (accessType !== "standard" && !req.securePdfUpload) return res.status(400).json({ success: false, message: "Secure notes must use the protected upload flow." });
    const isProtectedPdf = Boolean(req.file && accessType !== "standard");
    let fileUrl = req.body.fileUrl;
    let fileName = req.file?.originalname || "Resource";
    let fileSize = "";
    let assetId = "";
    let pageCount = 0;
    let pricePaise = 0;
    let resource = null;

    if (accessType === "paid") {
      if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(String(req.body.price ?? ""))) {
        return res.status(400).json({ success: false, message: "Enter a valid price with up to two decimal places." });
      }
      const rupees = Number(req.body.price);
      pricePaise = Math.round(rupees * 100);
      if (!Number.isSafeInteger(pricePaise) || pricePaise <= 0 || pricePaise > 100000000) {
        return res.status(400).json({ success: false, message: "Price must be greater than ₹0 and no more than ₹10,00,000." });
      }
    }

    if (isProtectedPdf) {
      let inspection;
      try {
        inspection = await inspectProtectedPdf(req.file);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      pageCount = inspection.pageCount;
      if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ success: false, message: "Secure PDF storage is not configured." });
      }
      fileSize = req.file.size > 1048576
        ? `${(req.file.size / 1048576).toFixed(2)} MB`
        : `${(req.file.size / 1024).toFixed(1)} KB`;
      assetId = `skillio/protected-notes/${tenantId}/${crypto.randomUUID()}`;
      resource = await Resource.create({
        tenantId, courseId, lectureId: lectureId || null, title: title.trim(),
        description: typeof description === "string" ? description.trim().slice(0, 1000) : "",
        topic: typeof topic === "string" && topic.trim() ? topic.trim().slice(0, 120) : "General",
        type: "pdf", fileUrl: "", fileName, fileSize, accessType, pricePaise,
        storageProvider: "cloudinary_authenticated", assetId, pageCount,
        assetVersion: 0,
        processingStatus: "processing", processingStartedAt: new Date(),
        ...(req.referenceLecture ? { referenceVideo: { provider: req.referenceLecture.videoProvider || "lecture", videoId: req.referenceLecture.youtubeVideoId || req.referenceLecture.bunnyVideoId || req.referenceLecture._id.toString() } } : {}),
        uploadedBy: userId,
      });
      try {
        const uploaded = await uploadProtectedPdf({
          filePath: req.file.path,
          tenantId,
          kind: "note",
          pageCount,
          assetId,
        });
        await Resource.updateOne(
          { _id: resource._id },
          {
            $set: {
              assetVersion: uploaded.assetVersion,
              ...(uploaded.processingStatus === "ready" ? { processingStatus: "ready" } : {}),
            },
          }
        );
        resource = await Resource.findById(resource._id);
      } catch (error) {
        await Resource.updateOne({ _id: resource._id }, { $set: { processingStatus: "failed" } });
        throw error;
      }
      fileUrl = "";
    }

    if (req.file && !isProtectedPdf) {
      const sizeBytes = req.file.size || 0;
      fileSize = sizeBytes > 1048576
        ? `${(sizeBytes / 1048576).toFixed(2)} MB`
        : `${(sizeBytes / 1024).toFixed(1)} KB`;

      // Try Cloudinary upload, fallback to local file URL
      try {
        const cloudUrl = await uploadCloudinary(req.file.path);
        if (cloudUrl) {
          fileUrl = cloudUrl;
        } else {
          fileUrl = `/public/${req.file.filename}`;
        }
      } catch (err) {
        console.warn("[Resource Cloudinary Warning, fallback to local path]", err);
        fileUrl = `/public/${req.file.filename}`;
      }
    }

    if (accessType !== "standard" && !isProtectedPdf) {
      return res.status(400).json({ success: false, message: "Free and paid notes must be uploaded as a PDF file." });
    }

    if (!fileUrl && !isProtectedPdf) {
      return res.status(400).json({ success: false, message: "Resource file or fileUrl is required" });
    }

    if (!resource) resource = await Resource.create({
      tenantId,
      courseId,
      lectureId: lectureId || null,
      title: title.trim(),
      description: typeof description === "string" ? description.trim().slice(0, 1000) : "",
      topic: topic ? topic.trim() : "General",
      type: isProtectedPdf ? "pdf" : type || "pdf",
      fileUrl,
      fileName,
      fileSize,
      accessType,
      pricePaise,
      storageProvider: isProtectedPdf ? "cloudinary_authenticated" : "legacy",
      assetId,
      pageCount,
      processingStatus: "ready",
      ...(req.referenceLecture ? { referenceVideo: { provider: req.referenceLecture.videoProvider || "lecture", videoId: req.referenceLecture.youtubeVideoId || req.referenceLecture.bunnyVideoId || req.referenceLecture._id.toString() } } : {}),
      uploadedBy: userId,
    });

    return res.status(resource.processingStatus === "processing" ? 202 : 201).json({
      success: true,
      message: "Resource uploaded successfully",
      resource: { ...resource.toObject(), assetId: undefined },
    });
  } catch (error) {
    console.error("[UploadResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to upload resource: ${error.message}`,
    });
  } finally {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
  }
};

export const handleCloudinaryEagerNotification = async (req, res) => {
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const signature = req.headers["x-cld-signature"];
  const timestamp = req.headers["x-cld-timestamp"];
  if (!secret || !Buffer.isBuffer(req.body) || typeof signature !== "string" || !/^\d{10}$/.test(String(timestamp || ""))) return res.status(400).json({ success: false });
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 2 * 60 * 60) return res.status(401).json({ success: false });
  const payload = Buffer.concat([req.body, Buffer.from(String(timestamp)), Buffer.from(secret)]);
  const digest = signature.length === 64 ? "sha256" : "sha1";
  const expected = crypto.createHash(digest).update(payload).digest();
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(401).json({ success: false });
  let notification;
  try { notification = JSON.parse(req.body.toString("utf8")); } catch { return res.status(400).json({ success: false }); }
  if (notification.notification_type !== "eager" || typeof notification.public_id !== "string" || !Array.isArray(notification.eager)) return res.status(400).json({ success: false });
  const [resource, note] = await Promise.all([
    Resource.findOne({ assetId: notification.public_id, storageProvider: "cloudinary_authenticated", processingStatus: "processing" }).select("_id pageCount"),
    Note.findOne({
      storageProvider: "cloudinary_authenticated",
      $or: [
        { assetId: notification.public_id, processingStatus: "processing" },
        { pendingAssetId: notification.public_id, replacementProcessing: true },
      ],
    }).select("_id pageCount +assetId +pendingAssetId +pendingPageCount +pendingFileName +pendingFileSize"),
  ]);
  const asset = resource || note;
  if (!asset) return res.status(200).json({ success: true, ignored: true });
  const expectedPages = note?.pendingAssetId === notification.public_id
    ? note.pendingPageCount
    : asset.pageCount;
  const succeeded = notification.eager.length === expectedPages &&
    notification.eager.every((item) => item.secure_url && item.status !== "failed");
  if (resource) {
    await Resource.updateOne(
      { _id: resource._id, processingStatus: "processing" },
      { $set: { processingStatus: succeeded ? "ready" : "failed", ...(Number.isSafeInteger(Number(notification.version)) ? { assetVersion: Number(notification.version) } : {}) } }
    );
  } else {
    await completeNotePdfProcessing({
      assetId: notification.public_id,
      succeeded,
      assetVersion: Number.isSafeInteger(Number(notification.version)) ? Number(notification.version) : 0,
    });
  }
  return res.status(200).json({ success: true, status: succeeded ? "ready" : "failed" });
};

/**
 * Get all resources belonging to a course (course-level and all lecture resources)
 * Requires course access (enrolled or creator/admin or preview)
 */
export const getCourseResources = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const access = await verifyCourseAccess({
      courseId,
      userId,
      userRole,
      tenantId,
    });

    const [course, managed, resources] = await Promise.all([Course.findOne({ _id: courseId, tenantId }).select("isPublished tenantId"), canManageCourse({ course: access.course, tenantId, userId, userRole }), Resource.find({ courseId, tenantId, ...(access.hasAccess ? {} : { isDisabled: false }) })
      .populate("lectureId", "lectureTitle")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })]);

    if (!course || (!access.hasAccess && !course.isPublished)) return res.status(404).json({ success: false, message: "Course not found." });
    if (managed) await Resource.updateMany({ tenantId, courseId, storageProvider: "cloudinary_authenticated", processingStatus: "processing", processingStartedAt: { $lt: new Date(Date.now() - 15 * 60_000) } }, { $set: { processingStatus: "failed" } });
    const activeEntitlements = userId ? await ResourceEntitlement.find({ userId, tenantId, courseId, status: "active", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("resourceId").lean() : [];
    const entitlementIds = new Set(activeEntitlements.map((item) => item.resourceId.toString()));
    const purchaseCounts = managed ? await ResourceEntitlement.aggregate([
      { $match: { tenantId: course.tenantId, courseId: course._id, status: "active", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] } },
      { $group: { _id: "$resourceId", count: { $sum: 1 } } },
    ]) : [];
    const purchaseCountByResource = new Map(purchaseCounts.map((entry) => [entry._id.toString(), entry.count]));
    const safeResources = resources.map((resource) => {
      const row = resource.toObject();
      const protectedPdf = row.storageProvider === "cloudinary_authenticated";
      const hasAccess = managed || (row.accessType === "free" && protectedPdf) || (row.accessType === "standard" && access.hasAccess) || entitlementIds.has(row._id.toString());
      delete row.assetId;
      if (protectedPdf) row.fileUrl = "";
      else if (!access.hasAccess) { delete row.fileUrl; }
      return { ...row, isUnlocked: protectedPdf ? hasAccess : access.hasAccess, ...(managed ? { purchaseCount: purchaseCountByResource.get(row._id.toString()) || 0 } : {}) };
    }).filter((row) => managed || !row.isDisabled);

    return res.status(200).json({
      success: true,
      count: safeResources.length,
      resources: safeResources,
    });
  } catch (error) {
    console.error("[GetCourseResources Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch resources: ${error.message}`,
    });
  }
};

// Every page request rechecks tenant, course access, entitlement and resource state.
const pageRequestBuckets = new Map();
export const getProtectedResourcePage = async (req, res) => {
  try {
    const { resourceId, pageNumber } = req.params;
    const page = Number(pageNumber);
    if (!Number.isSafeInteger(page) || page < 1) return res.status(404).end();
    const resource = await Resource.findOne({ _id: resourceId, tenantId: req.tenantId, storageProvider: "cloudinary_authenticated", isDisabled: false }).select("+assetId +assetVersion");
    if (!resource || resource.processingStatus !== "ready" || page > resource.pageCount) return res.status(404).end();
    const course = await Course.findOne({ _id: resource.courseId, tenantId: req.tenantId, isPublished: true });
    if (!course) return res.status(404).end();
    const requester = await User.findById(req.userId).select("email name");
    if (!requester) return res.status(401).end();
    const isEducator = await canManageCourse({ course, tenantId: req.tenantId, userId: req.userId, userRole: req.userRole });
    const membership = !isEducator && await InstitutionMembership.exists({ userId: req.userId, tenantId: req.tenantId, role: "student", status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] } });
    if (!isEducator && !membership) return res.status(403).json({ success: false, code: "INSTITUTION_MEMBERSHIP_REQUIRED" });
    let entitled = Boolean(isEducator);
    if (!entitled) {
      const courseAccess = await verifyCourseAccess({ courseId: course._id, userId: req.userId, userRole: req.userRole, tenantId: req.tenantId });
      entitled = resource.accessType === "free" || (resource.accessType === "standard" && courseAccess.hasAccess);
      if (resource.accessType === "paid") entitled = Boolean(await ResourceEntitlement.exists({ userId: req.userId, resourceId, tenantId: req.tenantId, status: "active", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }));
      if (!entitled) {
        return res.status(403).json({ success: false, code: "RESOURCE_ENTITLEMENT_REQUIRED" });
      }
    }
    const bucketKey = `${req.userId}:${resourceId}`;
    const now = Date.now();
    const bucket = pageRequestBuckets.get(bucketKey) || { startedAt: now, count: 0 };
    if (now - bucket.startedAt > 60_000) { bucket.startedAt = now; bucket.count = 0; }
    bucket.count += 1;
    pageRequestBuckets.set(bucketKey, bucket);
    const ipKey = `ip:${req.ip}:${resourceId}`;
    const ipBucket = pageRequestBuckets.get(ipKey) || { startedAt: now, count: 0 };
    if (now - ipBucket.startedAt > 60_000) { ipBucket.startedAt = now; ipBucket.count = 0; }
    ipBucket.count += 1;
    pageRequestBuckets.set(ipKey, ipBucket);
    if (pageRequestBuckets.size > 10_000) {
      for (const [key, item] of pageRequestBuckets) if (now - item.startedAt > 60_000) pageRequestBuckets.delete(key);
    }
    if (bucket.count > 180) return res.status(429).set("Retry-After", "60").json({ success: false, message: "Please slow down page requests." });
    if (ipBucket.count > 600) return res.status(429).set("Retry-After", "60").json({ success: false, message: "Please slow down page requests." });

    const imageBytes = await fetchProtectedPdfPage({
      assetId: resource.assetId,
      assetVersion: resource.assetVersion,
      page,
    });
    res.set({ "Content-Type": "image/jpeg", "Content-Length": String(imageBytes.length), "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline", "Cross-Origin-Resource-Policy": "same-site" });
    res.set("X-Page-Watermark", Buffer.from(`${requester.email || requester.name} · ${req.tenant?.name || "Skillio"}`).toString("base64"));
    return res.status(200).send(imageBytes);
  } catch (error) {
    console.error("[Protected resource page]", error);
    return res.status(500).json({ success: false, message: "Could not load this page." });
  }
};

/**
 * Get resources specifically attached to a lecture
 */
export const getLectureResources = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const lecture = await Lecture.findOne({ _id: lectureId, tenantId });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    const access = await verifyCourseAccess({
      courseId: lecture.courseId,
      userId,
      userRole,
      tenantId,
    });

    if (!access.hasAccess && !lecture.isPreviewFree) {
      return res.status(403).json({
        success: false,
        accessDenied: true,
        message: access.reason || "Enrolled access required for lecture resources.",
      });
    }

    const resources = await Resource.find({ lectureId, tenantId, isDisabled: false })
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });
    const [managed, entitlements] = await Promise.all([
      canManageCourse({ course: access.course || lecture.courseId, tenantId, userId, userRole }),
      userId ? ResourceEntitlement.find({ userId, tenantId, courseId: lecture.courseId, status: "active", $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select("resourceId").lean() : [],
    ]);
    const entitlementIds = new Set(entitlements.map((item) => item.resourceId.toString()));
    const safeResources = resources.map((resource) => {
      const row = resource.toObject();
      const protectedPdf = row.storageProvider === "cloudinary_authenticated";
      const unlocked = managed || (protectedPdf && row.accessType === "free") || (row.accessType === "standard" && access.hasAccess) || entitlementIds.has(row._id.toString());
      delete row.assetId;
      if (protectedPdf) row.fileUrl = "";
      return { ...row, isUnlocked: unlocked };
    });

    return res.status(200).json({
      success: true,
      count: safeResources.length,
      resources: safeResources,
    });
  } catch (error) {
    console.error("[GetLectureResources Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch lecture resources: ${error.message}`,
    });
  }
};

/**
 * Update resource metadata (title, description, topic, type)
 */
export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;
    const { title, description, topic, type, lectureId, price, isDisabled } = req.body;

    const resource = await Resource.findOne({ _id: id, tenantId });
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const course = await Course.findOne({ _id: resource.courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }
    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      return res.status(403).json({ success: false, message: "Not authorized to update this resource" });
    }

    if (typeof title !== "undefined") {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Resource title cannot be blank." });
      }
      resource.title = title.trim();
    }
    if (typeof description !== "undefined") resource.description = typeof description === "string" ? description.trim() : "";
    if (typeof topic !== "undefined") resource.topic = typeof topic === "string" && topic.trim() ? topic.trim() : "General";
    if (typeof type !== "undefined") {
      if (!["pdf", "notes", "formula_sheet", "code", "file", "link"].includes(type)) {
        return res.status(400).json({ success: false, message: "Resource type is not supported." });
      }
      resource.type = type;
    }
    if (typeof lectureId !== "undefined") {
      if (lectureId) {
        const lecture = await Lecture.findOne({ _id: lectureId, courseId: resource.courseId, tenantId });
        if (!lecture) {
          return res.status(404).json({ success: false, message: "Specified lecture not found in this course" });
        }
      }
      resource.lectureId = lectureId || null;
    }

    if (typeof isDisabled === "boolean") resource.isDisabled = isDisabled;
    if (typeof price !== "undefined") {
      if (resource.accessType !== "paid" || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(String(price))) return res.status(400).json({ success: false, message: "Enter a valid paid notes price." });
      const pricePaise = Math.round(Number(price) * 100);
      if (!Number.isSafeInteger(pricePaise) || pricePaise <= 0 || pricePaise > 100000000) return res.status(400).json({ success: false, message: "Price must be between ₹0.01 and ₹10,00,000." });
      resource.pricePaise = pricePaise;
    }

    if (req.file) {
      const upload = await uploadCloudinary(req.file.path);
      if (upload) resource.fileUrl = upload;
      resource.fileName = req.file.originalname;
    }

    await resource.save();

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      resource: { ...resource.toObject(), assetId: undefined },
    });
  } catch (error) {
    console.error("[UpdateResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to update resource: ${error.message}`,
    });
  }
};

/**
 * Delete a resource
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    const query = Resource.findOne({ _id: id, tenantId });
    const resource = typeof query?.select === "function" ? await query.select("+assetId") : await query;
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const course = await Course.findOne({ _id: resource.courseId, tenantId });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found in this organization" });
    }
    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this resource" });
    }

    await ResourceEntitlement.updateMany({ resourceId: resource._id, tenantId, status: "active" }, { $set: { status: "revoked" } });
    if (resource.storageProvider === "cloudinary_authenticated") {
      await cloudinary.uploader.destroy(resource.assetId, { resource_type: "image", type: "authenticated" }).catch((err) => console.warn("[Protected PDF deletion]", err.message));
    }
    await Resource.deleteOne({ _id: id, tenantId });

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("[DeleteResource Error]", error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete resource: ${error.message}`,
    });
  }
};
