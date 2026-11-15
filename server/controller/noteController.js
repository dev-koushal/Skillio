import crypto from "crypto";
import fs from "fs";
import Razorpay from "razorpay";
import { fileTypeFromFile } from "file-type";
import { v2 as cloudinary } from "cloudinary";
import "../config/cloudinary.js";
import Note from "../models/noteModel.js";
import Topic from "../models/topicModel.js";
import NoteEntitlement from "../models/noteEntitlementModel.js";
import NoteViewerSession from "../models/noteViewerSessionModel.js";
import Course from "../models/coursesModel.js";
import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import { ROLES } from "../utils/permissions.js";
import {
  fetchProtectedPdfPage,
  inspectProtectedPdf,
  uploadProtectedPdf,
} from "../services/protectedPdf.js";
import {
  commitPendingNoteAsset,
  failPendingNoteAsset,
} from "../services/noteProcessing.js";
import { logNoteAccess } from "../services/noteAudit.js";

const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return key_id && key_secret ? new Razorpay({ key_id, key_secret }) : null;
};

// Page delivery also checks database entitlements and viewer sessions on every request.
const pageRateLimitMap = new Map();

const VIEWER_SESSION_TTL_MS = 30 * 60 * 1000;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hashViewerToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const timingSafeSignatureMatch = (expected, received) => {
  if (typeof received !== "string" || !/^[a-f\d]{64}$/i.test(received)) return false;
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return expectedBytes.length === receivedBytes.length && crypto.timingSafeEqual(expectedBytes, receivedBytes);
};

const sanitizeNote = (note) => {
  const safe = typeof note?.toObject === "function" ? note.toObject() : { ...note };
  delete safe.assetId;
  delete safe.assetVersion;
  delete safe.pendingAssetId;
  delete safe.pendingAssetVersion;
  delete safe.pendingPageCount;
  delete safe.pendingFileName;
  delete safe.pendingFileSize;
  safe.fileUrl = "";
  return safe;
};

const parseTags = (tags) => {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === "string"
      ? tags.split(",")
      : [];
  return [...new Set(values.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 20);
};

const parseNotePrice = (accessType, value) => {
  if (accessType === "free") return { price: 0, pricePaise: 0 };
  if (accessType !== "paid" || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(String(value ?? ""))) {
    return null;
  }
  const price = Number(value);
  const pricePaise = Math.round(price * 100);
  if (!Number.isSafeInteger(pricePaise) || pricePaise < 1 || pricePaise > 100_000_000) return null;
  return { price, pricePaise };
};

const parseReferenceVideo = (provider, id, url) => {
  if (!provider) return { provider: "", videoId: "", url: "" };
  const cleanId = String(id || "").trim();
  const cleanUrl = String(url || "").trim();
  if (provider === "youtube") {
    const youtubeId = cleanId || cleanUrl.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1];
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId || "")) return null;
    return { provider, videoId: youtubeId, url: "" };
  }
  if (provider === "bunny") {
    if (!/^[A-Za-z0-9-]{8,80}$/.test(cleanId)) return null;
    return { provider, videoId: cleanId, url: "" };
  }
  return null;
};

const noteFileSize = (size) => size > 1_048_576
  ? `${(size / 1_048_576).toFixed(2)} MB`
  : `${(size / 1024).toFixed(1)} KB`;

const uploadThumbnail = async (file, tenantId) => {
  if (!file) return "";
  const allowedTypes = new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".webp", "image/webp"],
  ]);
  const extension = file.originalname?.slice(file.originalname.lastIndexOf(".")).toLowerCase();
  const detected = await fileTypeFromFile(file.path);
  if (
    file.size > 5 * 1024 * 1024 ||
    !allowedTypes.has(extension) ||
    detected?.mime !== allowedTypes.get(extension)
  ) {
    throw new Error("Choose a JPG, PNG, or WebP thumbnail smaller than 5 MB.");
  }
  if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Custom thumbnail storage is not configured.");
  }
  const result = await cloudinary.uploader.upload(file.path, {
    folder: `notes_thumbs_${tenantId}`,
    resource_type: "image",
    transformation: [{ width: 600, height: 750, crop: "fill" }],
  });
  return result.secure_url;
};

/**
 * =========================================================================
 * EDUCATOR CONTROLLER ACTIONS
 * =========================================================================
 */

export const createNote = async (req, res) => {
  const pdfFile = req.files?.file?.[0] || req.file;
  const thumbFile = req.files?.thumbnail?.[0];
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Active institution context is required." });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || tenant.status === "suspended") {
      return res.status(403).json({ success: false, message: "Institution not found or suspended." });
    }

    const {
      title,
      description = "",
      topic = "General",
      tags,
      accessType = "paid",
      price = "",
      status = "draft",
      referenceVideoProvider = "",
      referenceVideoId = "",
      referenceVideoUrl = "",
      relatedCourseId = null,
      thumbnailType = "generated",
    } = req.body;

    if (typeof title !== "string" || !title.trim() || title.trim().length > 180) {
      return res.status(400).json({ success: false, message: "Note title is required." });
    }
    if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 120) {
      return res.status(400).json({ success: false, message: "Note topic is required." });
    }
    if (typeof description !== "string" || description.length > 5000) {
      return res.status(400).json({ success: false, message: "Note description is too long." });
    }

    const pricing = parseNotePrice(accessType, price);
    if (!pricing) {
      return res.status(400).json({ success: false, message: "Enter a valid price between ₹0.01 and ₹10,00,000." });
    }
    if (!["draft", "published", "disabled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Choose a valid note status." });
    }
    const referenceVideo = parseReferenceVideo(referenceVideoProvider, referenceVideoId, referenceVideoUrl);
    if (!referenceVideo) {
      return res.status(400).json({ success: false, message: "The reference video details are not valid." });
    }

    let relatedCourse = null;
    if (relatedCourseId && relatedCourseId !== "none" && relatedCourseId !== "") {
      if (!isValidObjectId(relatedCourseId)) {
        return res.status(400).json({ success: false, message: "Referenced course is not valid." });
      }
      relatedCourse = await Course.findOne({ _id: relatedCourseId, tenantId });
      if (!relatedCourse) {
        return res.status(400).json({ success: false, message: "Referenced course not found in this institution." });
      }
    }

    if (!pdfFile) {
      return res.status(400).json({ success: false, message: "Study material PDF file is required." });
    }
    if (!pdfFile.path) {
      return res.status(400).json({ success: false, message: "The uploaded PDF could not be read." });
    }
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ success: false, message: "Secure PDF storage is not configured." });
    }

    let inspection;
    try {
      inspection = await inspectProtectedPdf(pdfFile);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const cleanTopic = topic.trim();
    await Topic.findOneAndUpdate(
      { tenantId, name: cleanTopic },
      { $setOnInsert: { tenantId, name: cleanTopic, description: "" } },
      { upsert: true, new: true }
    );
    let thumbnailUrl = "";
    if (typeof req.body.thumbnail === "string" && req.body.thumbnail.trim()) {
      thumbnailUrl = req.body.thumbnail.trim();
    } else if (thumbFile) {
      thumbnailUrl = await uploadThumbnail(thumbFile, tenantId);
    }
    const assetId = `skillio/protected-notes/${tenantId}/${crypto.randomUUID()}`;

    let note = await Note.create({
      tenantId,
      title: title.trim(),
      description: description.trim().slice(0, 5000),
      topic: cleanTopic,
      tags: parseTags(tags),
      thumbnail: thumbnailUrl,
      thumbnailType: thumbnailUrl && thumbnailType === "custom" ? "custom" : "generated",
      fileUrl: "",
      assetId,
      assetVersion: 0,
      storageProvider: "cloudinary_authenticated",
      fileName: pdfFile.originalname || "StudyNotes.pdf",
      fileSize: noteFileSize(inspection.fileSize),
      pageCount: inspection.pageCount,
      processingStatus: "processing",
      status: status === "published" ? "draft" : status,
      isPublished: false,
      accessType,
      price: pricing.price,
      pricePaise: pricing.pricePaise,
      currency: "INR",
      referenceVideo,
      relatedCourseId: relatedCourse ? relatedCourse._id : null,
      uploadedBy: userId,
    });

    const tempPdfPath = pdfFile.path;
    const noteId = note._id;

    // Process PDF in the background so educator UI is unblocked immediately
    setImmediate(async () => {
      try {
        const uploaded = await uploadProtectedPdf({
          filePath: tempPdfPath,
          tenantId,
          kind: "note",
          pageCount: inspection.pageCount,
          assetId,
        });
        await Note.updateOne(
          { _id: noteId },
          {
            $set: {
              assetVersion: uploaded.assetVersion,
              ...(uploaded.processingStatus === "ready"
                ? { processingStatus: "ready", status, isPublished: status === "published" }
                : {}),
            },
          }
        );
      } catch (error) {
        console.error("[Background Note PDF Upload Error]", error);
        await Note.updateOne({ _id: noteId }, { $set: { processingStatus: "failed", status: "draft", isPublished: false } });
      } finally {
        if (tempPdfPath) await fs.promises.unlink(tempPdfPath).catch(() => {});
      }
    });

    return res.status(202).json({
      success: true,
      message: "PDF processing has started. The note will be ready shortly.",
      note: sanitizeNote(note),
    });
  } catch (error) {
    console.error("[Create Note Error]", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create note." });
  } finally {
    if (thumbFile?.path) await fs.promises.unlink(thumbFile.path).catch(() => {});
  }
};

export const getEducatorNotes = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: "Institution context required." });

    const { search = "", topic = "", status = "", accessType = "" } = req.query;

    const filter = { tenantId };
    const searchValue = typeof search === "string" ? search.trim().slice(0, 100) : "";
    const topicValue = typeof topic === "string" ? topic.trim() : "";
    const statusValue = typeof status === "string" ? status.trim() : "";
    const accessValue = typeof accessType === "string" ? accessType.trim() : "";
    if (searchValue) {
      filter.title = { $regex: escapeRegex(searchValue), $options: "i" };
    }
    if (topicValue && topicValue !== "All") {
      filter.topic = topicValue;
    }
    if (["draft", "published", "disabled"].includes(statusValue)) {
      filter.status = statusValue;
    } else if (statusValue === "processing") {
      filter.$or = [{ processingStatus: "processing" }, { replacementProcessing: true }];
    }
    if (["free", "paid"].includes(accessValue)) {
      filter.accessType = accessValue;
    }

    const notes = await Note.find(filter)
      .populate("relatedCourseId", "title thumbnail price")
      .sort({ createdAt: -1 });

    const totalCount = await Note.countDocuments({ tenantId });
    const publishedCount = await Note.countDocuments({ tenantId, status: "published", processingStatus: "ready" });
    const draftCount = await Note.countDocuments({ tenantId, status: "draft" });

    return res.status(200).json({
      success: true,
      notes: notes.map(sanitizeNote),
      summary: {
        total: totalCount,
        published: publishedCount,
        drafts: draftCount,
      },
    });
  } catch (error) {
    console.error("[Get Educator Notes Error]", error);
    return res.status(500).json({ success: false, message: "Failed to fetch educator notes." });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const note = await Note.findOne({ _id: id, tenantId }).populate("relatedCourseId", "title thumbnail price");
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    return res.status(200).json({ success: true, note: sanitizeNote(note) });
  } catch (error) {
    console.error("[Get Note By Id Error]", error);
    return res.status(500).json({ success: false, message: "Failed to fetch note." });
  }
};

export const updateNote = async (req, res) => {
  const pdfFile = req.files?.file?.[0] || req.file;
  const thumbFile = req.files?.thumbnail?.[0];
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const note = await Note.findOne({ _id: id, tenantId }).select(
      "+assetId +assetVersion +pendingAssetId +pendingAssetVersion +pendingPageCount +pendingFileName +pendingFileSize"
    );
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }
    if (pdfFile && note.pendingAssetId) {
      return res.status(409).json({ success: false, message: "A PDF replacement is already processing." });
    }

    const {
      title,
      description,
      topic,
      tags,
      accessType,
      price,
      status,
      referenceVideoProvider,
      referenceVideoId,
      referenceVideoUrl,
      relatedCourseId,
      thumbnailType,
    } = req.body;

    if (typeof title !== "undefined") {
      if (typeof title !== "string" || !title.trim() || title.trim().length > 180) {
        return res.status(400).json({ success: false, message: "Enter a note title of 1–180 characters." });
      }
      note.title = title.trim();
    }
    if (typeof description !== "undefined") {
      if (typeof description !== "string" || description.length > 5000) {
        return res.status(400).json({ success: false, message: "Note description must be 5,000 characters or fewer." });
      }
      note.description = description.trim();
    }
    if (typeof topic !== "undefined") {
      if (typeof topic !== "string" || !topic.trim() || topic.trim().length > 120) {
        return res.status(400).json({ success: false, message: "Enter a valid topic name." });
      }
      note.topic = topic.trim();
      await Topic.findOneAndUpdate(
        { tenantId, name: topic.trim() },
        { $setOnInsert: { tenantId, name: topic.trim(), description: "" } },
        { upsert: true, new: true }
      );
    }

    const updatedAccessType = typeof accessType === "undefined" ? note.accessType : accessType;
    if (!["free", "paid"].includes(updatedAccessType)) {
      return res.status(400).json({ success: false, message: "Choose Free or Paid access." });
    }
    if (typeof accessType !== "undefined" || typeof price !== "undefined") {
      const pricing = parseNotePrice(updatedAccessType, typeof price === "undefined" ? note.price : price);
      if (!pricing) {
        return res.status(400).json({ success: false, message: "Enter a valid price between ₹0.01 and ₹10,00,000." });
      }
      note.accessType = updatedAccessType;
      note.price = pricing.price;
      note.pricePaise = pricing.pricePaise;
    }

    if (typeof status !== "undefined") {
      if (!["draft", "published", "disabled"].includes(status)) {
        return res.status(400).json({ success: false, message: "Choose a valid note status." });
      }
      if (status === "published" && note.processingStatus !== "ready" && !note.replacementProcessing) {
        return res.status(409).json({ success: false, message: "This PDF must be ready before the note can be published." });
      }
      note.status = status;
      note.isPublished = note.status === "published";
    }

    if (typeof referenceVideoProvider !== "undefined") {
      const referenceVideo = parseReferenceVideo(referenceVideoProvider, referenceVideoId, referenceVideoUrl);
      if (!referenceVideo) return res.status(400).json({ success: false, message: "The reference video details are not valid." });
      note.referenceVideo = referenceVideo;
    }

    if (typeof relatedCourseId !== "undefined") {
      if (!relatedCourseId || relatedCourseId === "none" || relatedCourseId === "") {
        note.relatedCourseId = null;
      } else {
        if (!isValidObjectId(relatedCourseId)) {
          return res.status(400).json({ success: false, message: "Referenced course is not valid." });
        }
        const course = await Course.findOne({ _id: relatedCourseId, tenantId });
        if (!course) return res.status(400).json({ success: false, message: "Referenced course not found in this institution." });
        note.relatedCourseId = course._id;
      }
    }

    if (typeof req.body.thumbnail === "string" && req.body.thumbnail.trim()) {
      note.thumbnail = req.body.thumbnail.trim();
      note.thumbnailType = "custom";
    } else if (thumbFile) {
      note.thumbnail = await uploadThumbnail(thumbFile, tenantId);
      note.thumbnailType = "custom";
    } else if (thumbnailType === "generated") {
      note.thumbnail = "";
      note.thumbnailType = "generated";
    } else if (thumbnailType === "custom" && note.thumbnail) {
      note.thumbnailType = "custom";
    }

    await note.save();

    let responseStatus = 200;
    let message = "Note updated successfully.";
    if (pdfFile) {
      if (!pdfFile.path) return res.status(400).json({ success: false, message: "The uploaded PDF could not be read." });
      if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ success: false, message: "Secure PDF storage is not configured." });
      }
      let inspection;
      try {
        inspection = await inspectProtectedPdf(pdfFile);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      const pendingAssetId = `skillio/protected-notes/${tenantId}/${crypto.randomUUID()}`;
      note.pendingAssetId = pendingAssetId;
      note.pendingPageCount = inspection.pageCount;
      note.pendingFileName = pdfFile.originalname || "StudyNotes.pdf";
      note.pendingFileSize = noteFileSize(inspection.fileSize);
      note.pendingAssetVersion = 0;
      note.replacementProcessing = true;
      await note.save();

      const tempUpdatePdfPath = pdfFile.path;
      const targetNoteId = note._id;

      // Process replacement PDF in the background
      setImmediate(async () => {
        try {
          const uploaded = await uploadProtectedPdf({
            filePath: tempUpdatePdfPath,
            tenantId,
            kind: "note",
            pageCount: inspection.pageCount,
            assetId: pendingAssetId,
          });
          if (uploaded.processingStatus === "ready") {
            await commitPendingNoteAsset(targetNoteId, pendingAssetId, uploaded.assetVersion);
          } else {
            await Note.updateOne(
              { _id: targetNoteId, pendingAssetId },
              { $set: { pendingAssetVersion: uploaded.assetVersion } }
            );
          }
        } catch (err) {
          console.error("[Background Update PDF Error]", err);
          await failPendingNoteAsset(targetNoteId, pendingAssetId);
        } finally {
          if (tempUpdatePdfPath) await fs.promises.unlink(tempUpdatePdfPath).catch(() => {});
        }
      });

      responseStatus = 202;
      message = "PDF replacement accepted and is processing. The current document remains available until it is ready.";
    }

    const updatedNote = await Note.findOne({ _id: note._id, tenantId }).populate("relatedCourseId", "title thumbnail price");
    return res.status(responseStatus).json({ success: true, message, note: sanitizeNote(updatedNote) });
  } catch (error) {
    console.error("[Update Note Error]", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update note." });
  } finally {
    if (thumbFile?.path) await fs.promises.unlink(thumbFile.path).catch(() => {});
  }
};

export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const note = await Note.findOne({ _id: id, tenantId }).select("+assetId +pendingAssetId");
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    // Revoke entitlements
    await NoteEntitlement.updateMany(
      { noteId: note._id, tenantId, status: "active" },
      { $set: { status: "revoked" } }
    );
    await NoteViewerSession.deleteMany({ noteId: note._id, tenantId });

    if (note.storageProvider === "cloudinary_authenticated") {
      for (const assetId of [note.assetId, note.pendingAssetId].filter(Boolean)) {
        await cloudinary.uploader.destroy(assetId, { resource_type: "image", type: "authenticated" })
          .catch((error) => console.warn("[Note PDF deletion]", error.message));
      }
    }

    await Note.deleteOne({ _id: id, tenantId });

    return res.status(200).json({ success: true, message: "Note deleted successfully." });
  } catch (error) {
    console.error("[Delete Note Error]", error);
    return res.status(500).json({ success: false, message: "Failed to delete note." });
  }
};

/**
 * =========================================================================
 * TOPIC ACTIONS (INSTITUTION-SCOPED)
 * =========================================================================
 */

export const getInstitutionTopics = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: "Institution context required." });

    const noteTopicFilter = req.userRole === ROLES.EDUCATOR || req.userRole === ROLES.PLATFORM_ADMIN
      ? { tenantId }
      : { tenantId, status: "published", isPublished: true, processingStatus: "ready" };
    const [savedTopics, distinctNoteTopics] = await Promise.all([
      Topic.find({ tenantId }).sort({ name: 1 }),
      Note.distinct("topic", noteTopicFilter),
    ]);

    const topicSet = new Set(savedTopics.map((t) => t.name.trim()));
    distinctNoteTopics.forEach((t) => {
      if (t && t.trim()) topicSet.add(t.trim());
    });

    const topicList = Array.from(topicSet).sort();

    return res.status(200).json({
      success: true,
      topics: topicList,
    });
  } catch (error) {
    console.error("[Get Topics Error]", error);
    return res.status(500).json({ success: false, message: "Failed to fetch topics." });
  }
};

export const createInstitutionTopic = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { name, description = "" } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Topic name is required." });

    const cleanName = name.trim();
    const topic = await Topic.findOneAndUpdate(
      { tenantId, name: cleanName },
      { $setOnInsert: { tenantId, name: cleanName, description: description.trim() } },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, topic });
  } catch (error) {
    console.error("[Create Topic Error]", error);
    return res.status(500).json({ success: false, message: "Failed to create topic." });
  }
};

/**
 * =========================================================================
 * STUDENT ACTIONS (DISCOVERY, DETAILS, ORDER, VERIFICATION, READING)
 * =========================================================================
 */

export const getStudentNotes = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId) return res.status(400).json({ success: false, message: "Institution context required." });

    const { search = "", topic = "", accessType = "" } = req.query;

    const filter = {
      tenantId,
      status: "published",
      isPublished: true,
      processingStatus: "ready",
    };

    const searchValue = typeof search === "string" ? search.trim().slice(0, 100) : "";
    const topicValue = typeof topic === "string" ? topic.trim() : "";
    const accessValue = typeof accessType === "string" ? accessType.trim() : "";
    if (searchValue) {
      filter.title = { $regex: escapeRegex(searchValue), $options: "i" };
    }
    if (topicValue && topicValue !== "All") {
      filter.topic = topicValue;
    }
    if (["free", "paid"].includes(accessValue)) {
      filter.accessType = accessValue;
    }

    const notes = await Note.find(filter)
      .select("-assetId -assetVersion")
      .populate("relatedCourseId", "title thumbnail price")
      .sort({ createdAt: -1 })
      .lean();

    // Check user entitlements if authenticated
    let userEntitlements = new Set();
    if (userId) {
      const entitlements = await NoteEntitlement.find({
        userId,
        tenantId,
        status: "active",
      }).select("noteId").lean();
      userEntitlements = new Set(entitlements.map((e) => e.noteId.toString()));
    }

    const safeNotes = notes.map((n) => ({
      ...sanitizeNote(n),
      isPurchased: userEntitlements.has(n._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      count: safeNotes.length,
      notes: safeNotes,
    });
  } catch (error) {
    console.error("[Get Student Notes Error]", error);
    return res.status(500).json({ success: false, message: "Failed to fetch study notes." });
  }
};

export const getStudentNoteDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;

    const note = await Note.findOne({
      _id: id,
      tenantId,
      status: "published",
      isPublished: true,
      processingStatus: "ready",
    })
      .select("-assetId -assetVersion")
      .populate("relatedCourseId", "title thumbnail price slug isPublished")
      .lean();

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found in this institution." });
    }

    let isPurchased = false;
    if (userId) {
      isPurchased = await NoteEntitlement.exists({
        userId,
        noteId: note._id,
        tenantId,
        status: "active",
      });
    }

    return res.status(200).json({
      success: true,
      note: {
        ...sanitizeNote(note),
        isPurchased: Boolean(isPurchased),
      },
    });
  } catch (error) {
    console.error("[Get Note Details Error]", error);
    return res.status(500).json({ success: false, message: "Failed to load note details." });
  }
};

export const createNoteOrder = async (req, res) => {
  try {
    const { noteId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;

    const note = await Note.findOne({
      _id: noteId,
      tenantId,
      status: "published",
      isPublished: true,
      accessType: "paid",
      processingStatus: "ready",
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Paid note not found." });
    }
    if (!Number.isSafeInteger(note.pricePaise) || note.pricePaise < 1 || note.pricePaise > 100_000_000) {
      return res.status(409).json({ success: false, message: "This note does not have a valid price." });
    }

    const user = await User.findById(userId).select("role name email");
    if (!user || user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only student accounts can purchase study material." });
    }

    const membership = await InstitutionMembership.exists({
      userId,
      tenantId,
      role: "student",
      status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
    });
    if (!membership) {
      return res.status(403).json({
        success: false,
        code: "INSTITUTION_MEMBERSHIP_REQUIRED",
        message: "Join this institution before purchasing its notes.",
      });
    }

    const alreadyOwned = await NoteEntitlement.exists({
      userId,
      noteId: note._id,
      tenantId,
      status: "active",
    });
    if (alreadyOwned) {
      return res.status(409).json({ success: false, code: "NOTE_ALREADY_PURCHASED", message: "You already own this note." });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ success: false, message: "Payment service is temporarily unavailable." });
    }

    const order = await razorpay.orders.create({
      amount: note.pricePaise,
      currency: "INR",
      receipt: `n_${note._id.toString().slice(-10)}_${Date.now().toString().slice(-6)}`,
      notes: {
        tenantId: tenantId.toString(),
        noteId: note._id.toString(),
        userId: userId.toString(),
        purpose: "paid_note",
      },
    });

    return res.status(200).json({
      success: true,
      ...order,
      key: process.env.RAZORPAY_KEY_ID?.trim(),
      noteTitle: note.title,
      price: note.price,
    });
  } catch (error) {
    console.error("[Create Note Order Error]", error);
    return res.status(500).json({ success: false, message: "Could not initiate note purchase." });
  }
};

export const verifyNotePayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string" ||
      !orderId ||
      !paymentId ||
      !signature
    ) {
      return res.status(400).json({ success: false, message: "Payment details are incomplete." });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ success: false, message: "Payment service unavailable." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!secret) return res.status(503).json({ success: false, message: "Payment service unavailable." });

    const order = await razorpay.orders.fetch(orderId);
    const orderNotes = order?.notes || {};

    if (
      orderNotes.purpose !== "paid_note" ||
      orderNotes.userId !== userId.toString() ||
      orderNotes.tenantId !== tenantId.toString()
    ) {
      return res.status(403).json({ success: false, message: "Payment does not match current student or institution." });
    }

    const note = await Note.findOne({
      _id: orderNotes.noteId,
      tenantId,
      status: "published",
      isPublished: true,
      processingStatus: "ready",
    });
    if (
      !note ||
      !Number.isSafeInteger(Number(order.amount)) ||
      Number(order.amount) < 1 ||
      Number(order.amount_paid) !== Number(order.amount) ||
      order.currency !== "INR" ||
      order.status !== "paid"
    ) {
      return res.status(409).json({ success: false, message: "The paid order does not match an available note." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (!timingSafeSignatureMatch(generatedSignature, signature)) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    const payment = await razorpay.payments.fetch(paymentId);
    if (
      payment?.id !== paymentId ||
      payment.order_id !== orderId ||
      payment.status !== "captured" ||
      Number(payment.amount) !== Number(order.amount) ||
      payment.currency !== "INR"
    ) {
      return res.status(400).json({ success: false, message: "Payment has not been captured for this note." });
    }

    const user = await User.findById(userId).select("role");
    const membership = user?.role === "student" && await InstitutionMembership.exists({
      userId,
      tenantId,
      role: "student",
      status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
    });
    if (!membership) {
      return res.status(403).json({ success: false, code: "INSTITUTION_MEMBERSHIP_REQUIRED" });
    }

    let entitlement = await NoteEntitlement.findOne({ userId, noteId: note._id, tenantId });
    let createdEntitlement = false;
    if (entitlement?.status === "active") {
      if (entitlement.paymentId !== paymentId) {
        return res.status(409).json({ success: false, message: "This note is already unlocked for this account." });
      }
    } else if (entitlement) {
      const update = await NoteEntitlement.updateOne(
        { _id: entitlement._id, status: { $ne: "active" } },
        { $set: { paymentId, orderId, status: "active", source: "purchase", purchasedAt: new Date() } }
      );
      if (update.modifiedCount) createdEntitlement = true;
      entitlement = await NoteEntitlement.findById(entitlement._id);
    } else {
      try {
        entitlement = await NoteEntitlement.create({
          userId,
          noteId: note._id,
          tenantId,
          paymentId,
          orderId,
          status: "active",
          source: "purchase",
          purchasedAt: new Date(),
        });
        createdEntitlement = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        entitlement = await NoteEntitlement.findOne({ userId, noteId: note._id, tenantId });
        if (entitlement?.status !== "active" || entitlement.paymentId !== paymentId) throw error;
      }
    }

    if (createdEntitlement) {
      await Note.updateOne({ _id: note._id, tenantId }, { $inc: { purchaseCount: 1 } });
    }

    return res.status(200).json({
      success: true,
      message: "Note unlocked! You can now read it securely.",
      entitlement,
    });
  } catch (error) {
    console.error("[Verify Note Payment Error]", error);
    return res.status(500).json({ success: false, message: "Could not verify payment." });
  }
};

export const claimFreeNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;

    const note = await Note.findOne({
      _id: noteId,
      tenantId,
      status: "published",
      isPublished: true,
      processingStatus: "ready",
      accessType: "free",
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Free study note not found." });
    }

    const user = await User.findById(userId).select("role");
    if (user?.role !== "student") {
      return res.status(403).json({ success: false, message: "Only student accounts can claim study material." });
    }
    const membership = await InstitutionMembership.exists({
      userId,
      tenantId,
      role: "student",
      status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
    });
    if (!membership) {
      return res.status(403).json({ success: false, code: "INSTITUTION_MEMBERSHIP_REQUIRED" });
    }

    let entitlement = await NoteEntitlement.findOne({ userId, noteId: note._id, tenantId });
    let granted = false;
    if (!entitlement) {
      try {
        entitlement = await NoteEntitlement.create({
          userId,
          noteId: note._id,
          tenantId,
          status: "active",
          source: "free_grant",
          purchasedAt: new Date(),
        });
        granted = true;
      } catch (error) {
        if (error.code !== 11000) throw error;
        entitlement = await NoteEntitlement.findOne({ userId, noteId: note._id, tenantId });
      }
    }
    if (entitlement?.status !== "active") {
      const update = await NoteEntitlement.updateOne(
        { _id: entitlement._id, status: { $ne: "active" } },
        { $set: { status: "active", source: "free_grant", purchasedAt: new Date() } }
      );
      granted = Boolean(update.modifiedCount);
      entitlement = await NoteEntitlement.findById(entitlement._id);
    }

    if (granted) {
      await Note.updateOne({ _id: note._id, tenantId }, { $inc: { accessCount: 1 } });
    }

    return res.status(200).json({
      success: true,
      message: "Note added to your library.",
      entitlement,
    });
  } catch (error) {
    console.error("[Claim Free Note Error]", error);
    return res.status(500).json({ success: false, message: "Could not claim note." });
  }
};

/**
 * =========================================================================
 * SECURE DOCUMENT VIEWER & PAGE DELIVERY (PARTS 19-25)
 * =========================================================================
 */

export const createViewerSession = async (req, res) => {
  try {
    const { id: noteId } = req.params;
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;

    if (!isValidObjectId(noteId) || !tenantId || !userId || !req.sessionId) {
      return res.status(401).json({ success: false, code: "VIEWER_SESSION_INVALID", message: "Sign in again to open this note." });
    }

    const note = await Note.findOne({ _id: noteId, tenantId }).select("+assetId");
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    const isOwner =
      userRole === ROLES.PLATFORM_ADMIN ||
      (userRole === ROLES.EDUCATOR && (note.uploadedBy.toString() === userId.toString() || req.tenant?.ownerId?.toString() === userId.toString()));
    if (note.processingStatus !== "ready" || !note.assetId || note.storageProvider !== "cloudinary_authenticated") {
      return res.status(409).json({ success: false, code: "NOTE_NOT_READY", message: "This document is not ready to view." });
    }
    if (!isOwner && (note.status !== "published" || !note.isPublished)) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    if (!isOwner) {
      const [membership, entitlement] = await Promise.all([
        InstitutionMembership.exists({
          userId,
          tenantId,
          role: "student",
          status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
        }),
        NoteEntitlement.exists({
          userId,
          noteId: note._id,
          tenantId,
          status: "active",
        }),
      ]);
      if (!membership || !entitlement) {
        await logNoteAccess(req, { noteId: note._id, event: "access_denied", reason: "membership_or_entitlement_required" });
        return res.status(403).json({
          success: false,
          code: "NOTE_ACCESS_DENIED",
          message: "You must have active access to view this note.",
        });
      }
    }

    const user = await User.findById(userId).select("name email");
    const tenant = await Tenant.findById(tenantId).select("name title");
    if (!user || !tenant) {
      return res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
    }
    const viewerSessionId = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + VIEWER_SESSION_TTL_MS);
    await NoteViewerSession.create({
      tokenHash: hashViewerToken(viewerSessionId),
      userId,
      tenantId,
      noteId: note._id,
      authSessionId: req.sessionId,
      expiresAt,
    });
    await Note.updateOne({ _id: note._id, tenantId }, { $inc: { accessCount: 1 } });
    await logNoteAccess(req, { noteId: note._id, event: "viewer_session_created" });

    return res.status(200).json({
      success: true,
      viewerSessionId,
      noteId: note._id,
      title: note.title,
      topic: note.topic,
      pageCount: note.pageCount,
      referenceVideo: note.referenceVideo,
      watermark: `${user.name || user.email || "Student"} · ${tenant.name || "Institution"} · Purchased through Skillio`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[Create Viewer Session Error]", error);
    return res.status(500).json({ success: false, message: "Could not start document viewer session." });
  }
};

const incrementRateLimit = (key, limit, now) => {
  let bucket = pageRateLimitMap.get(key);
  if (!bucket || now - bucket.startedAt >= 60_000) {
    bucket = { startedAt: now, count: 0 };
  }
  bucket.count += 1;
  pageRateLimitMap.set(key, bucket);
  if (pageRateLimitMap.size > 10_000) {
    for (const [bucketKey, entry] of pageRateLimitMap) {
      if (now - entry.startedAt >= 60_000) pageRateLimitMap.delete(bucketKey);
    }
  }
  return bucket.count <= limit;
};

export const getNotePage = async (req, res) => {
  try {
    const { id: noteId, pageNumber } = req.params;
    const page = Number(pageNumber);
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userRole = req.userRole;
    const viewerToken = req.headers["x-note-viewer-session"];

    if (!userId || !tenantId || !req.sessionId) {
      return res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
    }
    if (!isValidObjectId(noteId) || !Number.isSafeInteger(page) || page < 1 || typeof viewerToken !== "string") {
      return res.status(404).json({ success: false, message: "Document page not found." });
    }

    const viewerSession = await NoteViewerSession.findOne({
      tokenHash: hashViewerToken(viewerToken),
      userId,
      tenantId,
      noteId,
      authSessionId: req.sessionId,
      expiresAt: { $gt: new Date() },
    }).select("_id");
    if (!viewerSession) {
      await logNoteAccess(req, { noteId, event: "access_denied", pageNumber: page, reason: "viewer_session_expired_or_invalid" });
      return res.status(401).json({
        success: false,
        code: "VIEWER_SESSION_INVALID",
        message: "Your secure viewer session expired. Reopen the note to continue.",
      });
    }

    const note = await Note.findOne({ _id: noteId, tenantId }).select("+assetId +assetVersion");
    if (!note || note.processingStatus !== "ready" || !note.assetId || note.storageProvider !== "cloudinary_authenticated") {
      return res.status(404).json({ success: false, message: "Document page not found." });
    }
    if (page > note.pageCount) return res.status(404).json({ success: false, message: "Document page not found." });

    const isOwner =
      userRole === ROLES.PLATFORM_ADMIN ||
      (userRole === ROLES.EDUCATOR && (
        note.uploadedBy.toString() === userId.toString() ||
        req.tenant?.ownerId?.toString() === userId.toString()
      ));
    if (!isOwner && (note.status !== "published" || !note.isPublished)) {
      return res.status(404).json({ success: false, message: "Document page not found." });
    }

    if (!isOwner) {
      const [membership, entitlement] = await Promise.all([
        InstitutionMembership.exists({
          userId,
          tenantId,
          role: "student",
          status: { $in: ["active", "enrolled", "ACTIVE", "ENROLLED"] },
        }),
        NoteEntitlement.exists({
          userId,
          noteId: note._id,
          tenantId,
          status: "active",
        }),
      ]);
      if (!membership || !entitlement) {
        await logNoteAccess(req, { noteId: note._id, event: "access_denied", pageNumber: page, reason: "membership_or_entitlement_revoked" });
        return res.status(403).json({ success: false, code: "NOTE_ACCESS_DENIED", message: "Active note access is required." });
      }
    }

    const user = await User.findById(userId).select("name email");
    const tenant = await Tenant.findById(tenantId).select("name title");
    if (!user || !tenant) return res.status(401).json({ success: false, code: "UNAUTHENTICATED" });

    const now = Date.now();
    const userKey = `user:${userId}:${noteId}`;
    const ipKey = `ip:${req.ip}:${noteId}`;
    if (!incrementRateLimit(userKey, 180, now) || !incrementRateLimit(ipKey, 600, now)) {
      return res.status(429).set("Retry-After", "60").json({ success: false, message: "Please slow down page requests." });
    }

    let imageBytes;
    try {
      imageBytes = await fetchProtectedPdfPage({ assetId: note.assetId, assetVersion: note.assetVersion, page });
    } catch (error) {
      console.error("[Note PDF page retrieval]", error.message);
      return res.status(502).json({ success: false, message: "This page is temporarily unavailable. Please retry." });
    }

    await logNoteAccess(req, { noteId: note._id, event: "page_served", pageNumber: page });
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Length": String(imageBytes.length),
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "same-site",
    });
    return res.status(200).send(imageBytes);
  } catch (error) {
    console.error("[Get Note Page Error]", error);
    return res.status(500).json({ success: false, message: "Could not load document page." });
  }
};
