import LiveClass from "../models/liveClassModel.js";
import { parseYouTubeVideoUrl } from "../utils/youtubeVideo.js";

const liveClassFields = "_id title description scheduledAt status isActive startsAt endsAt createdBy createdAt updatedAt";
const getScopedLiveClass = (id, tenantId) => LiveClass.findOne({ _id: id, tenantId });

export const listLiveClasses = async (req, res) => {
  const classes = await LiveClass.find({ tenantId: req.tenantId, status: { $in: ["scheduled", "live"] } })
    .select(`${liveClassFields} youtubeLiveUrl youtubeVideoId`)
    .populate("createdBy", "name")
    .sort({ isActive: -1, scheduledAt: 1 })
    .lean();
  return res.json({ success: true, liveClasses: classes });
};

export const createLiveClass = async (req, res) => {
  try {
    const { videoId, canonicalUrl } = parseYouTubeVideoUrl(req.body?.youtubeLiveUrl);
    const title = typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim().slice(0, 140)
      : "Live class";
    const scheduledAt = new Date();
    const existingLink = await LiveClass.findOne({
      tenantId: req.tenantId,
      youtubeVideoId: videoId,
      status: { $in: ["scheduled", "live"] },
    }).select("_id");
    if (existingLink) return res.status(409).json({ success: false, message: "This YouTube link is already being tracked." });

    const liveClass = await LiveClass.create({
      tenantId: req.tenantId,
      institutionId: req.tenantId,
      createdBy: req.userId,
      title,
      description: "",
      youtubeVideoId: videoId,
      youtubeLiveUrl: canonicalUrl,
      scheduledAt,
      status: "scheduled",
      isActive: false,
    });
    return res.status(201).json({
      success: true,
      liveClass,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message || "Could not create the live class." });
  }
};

export const updateLiveClass = async (req, res) => {
  try {
    const liveClass = await getScopedLiveClass(req.params.liveClassId, req.tenantId);
    if (!liveClass) return res.status(404).json({ success: false, message: "Live class not found in this institution." });
    if (liveClass.isActive && req.body?.youtubeLiveUrl) return res.status(409).json({ success: false, message: "End the live class before changing its YouTube source." });

    if (typeof req.body?.title === "string") {
      const title = req.body.title.trim();
      if (!title || title.length > 140) return res.status(400).json({ success: false, message: "Enter a title up to 140 characters." });
      liveClass.title = title;
    }
    if (typeof req.body?.description === "string") liveClass.description = req.body.description.trim().slice(0, 2000);
    if (typeof req.body?.youtubeLiveUrl === "string") {
      const { videoId, canonicalUrl } = parseYouTubeVideoUrl(req.body.youtubeLiveUrl);
      liveClass.youtubeVideoId = videoId;
      liveClass.youtubeLiveUrl = canonicalUrl;
    }
    if (typeof req.body?.scheduledAt === "string") {
      const date = new Date(req.body.scheduledAt);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Choose a valid start date and time." });
      if (date.getTime() < Date.now() - 60_000) return res.status(400).json({ success: false, message: "Choose a future time for this scheduled class." });
      liveClass.scheduledAt = date;
    }
    await liveClass.save();
    return res.json({ success: true, liveClass });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message || "Could not update the live class." });
  }
};

export const activateLiveClass = async (req, res) => {
  try {
    const target = await getScopedLiveClass(req.params.liveClassId, req.tenantId);
    if (!target) return res.status(404).json({ success: false, message: "Live class not found in this institution." });
    if (target.status === "cancelled") return res.status(409).json({ success: false, message: "Cancelled live classes cannot be started." });

    const now = new Date();
    const alreadyLive = target.isActive && target.status === "live";
    await LiveClass.updateMany(
      { tenantId: req.tenantId, isActive: true, _id: { $ne: target._id } },
      { $set: { isActive: false, status: "ended", endsAt: now } }
    );
    target.status = "live";
    target.isActive = true;
    target.startsAt = alreadyLive ? target.startsAt : now;
    target.endsAt = null;
    await target.save();
    return res.json({ success: true, liveClass: target });
  } catch (error) {
    const duplicateLive = error.code === 11000;
    return res.status(duplicateLive ? 409 : 400).json({ success: false, message: duplicateLive ? "Another live class just became active. Refresh and try again." : error.message || "Could not start the live class." });
  }
};

export const endLiveClass = async (req, res) => {
  const liveClass = await getScopedLiveClass(req.params.liveClassId, req.tenantId);
  if (!liveClass) return res.status(404).json({ success: false, message: "Live class not found in this institution." });
  if (!liveClass.isActive || liveClass.status !== "live") return res.status(409).json({ success: false, message: "Only an active live class can be ended." });
  liveClass.status = "ended";
  liveClass.isActive = false;
  liveClass.endsAt = new Date();
  await liveClass.save();
  return res.json({ success: true, liveClass });
};

export const cancelLiveClass = async (req, res) => {
  const liveClass = await getScopedLiveClass(req.params.liveClassId, req.tenantId);
  if (!liveClass) return res.status(404).json({ success: false, message: "Live class not found in this institution." });
  if (liveClass.isActive && liveClass.status === "live") {
    liveClass.status = "ended";
    liveClass.endsAt = new Date();
  } else if (liveClass.status === "scheduled") {
    liveClass.status = "cancelled";
  } else {
    return res.status(409).json({ success: false, message: "This live link is already ended or cancelled." });
  }
  liveClass.isActive = false;
  await liveClass.save();
  return res.json({ success: true, liveClass, message: "Live link removed from the institution home." });
};

export const getCurrentLiveClass = async (req, res) => {
  const liveClass = await LiveClass.findOne({ tenantId: req.tenantId, isActive: true, status: "live" })
    .select(liveClassFields)
    .populate("createdBy", "name")
    .lean();
  return res.json({ success: true, liveClass: liveClass || null });
};

export const getLiveClassPlayback = async (req, res) => {
  const liveClass = await LiveClass.findOne({
    _id: req.params.liveClassId,
    tenantId: req.tenantId,
    isActive: true,
    status: "live",
  }).select("title description youtubeVideoId startsAt").lean();
  if (!liveClass) return res.status(404).json({ success: false, message: "This live class is not currently available." });
  return res.json({
    success: true,
    playback: { authorized: true, videoProvider: "youtube", youtubeVideoId: liveClass.youtubeVideoId, title: liveClass.title, isLive: true, startsAt: liveClass.startsAt },
  });
};

export const validateLiveClassYouTubeUrl = async (req, res) => {
  try {
    const parsed = parseYouTubeVideoUrl(req.body?.youtubeLiveUrl);
    return res.json({ success: true, videoId: parsed.videoId, canonicalUrl: parsed.canonicalUrl });
  } catch (error) {
    return res.status(error.status || 400).json({ success: false, message: error.message || "Enter a valid YouTube Live URL." });
  }
};

