import LiveClass from "../models/liveClassModel.js";

const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
let timer = null;
let isSyncing = false;

async function getVideos(videoIds, apiKey) {
  const url = new URL(YOUTUBE_VIDEOS_ENDPOINT);
  url.searchParams.set("part", "snippet,liveStreamingDetails");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`YouTube status request failed (${response.status}).`);
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

async function endOtherTenantLives(tenantId, activeClassId, endedAt) {
  await LiveClass.updateMany(
    { tenantId, isActive: true, _id: { $ne: activeClassId } },
    { $set: { status: "ended", isActive: false, endsAt: endedAt } },
  );
}

export async function syncYouTubeLiveClasses() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey || isSyncing) return { configured: Boolean(apiKey), checked: 0 };

  isSyncing = true;
  let checked = 0;
  try {
    const classes = await LiveClass.find({ status: { $in: ["scheduled", "live"] } })
      .select("_id tenantId youtubeVideoId status isActive startsAt")
      .lean();
    if (!classes.length) return { configured: true, checked };

    const byVideoId = new Map(classes.map((item) => [item.youtubeVideoId, item]));
    const ids = [...byVideoId.keys()];
    for (let offset = 0; offset < ids.length; offset += 50) {
      const batch = ids.slice(offset, offset + 50);
      const videos = await getVideos(batch, apiKey);
      checked += batch.length;
      const videosById = new Map(videos.map((video) => [video.id, video]));

      for (const videoId of batch) {
        const item = byVideoId.get(videoId);
        const video = videosById.get(videoId);
        // Missing results can mean private/removed videos or temporary API visibility;
        // preserve current state and let the next poll reconcile it.
        if (!item || !video) continue;

        const details = video.liveStreamingDetails;
        const isActuallyLive = video.snippet?.liveBroadcastContent === "live"
          && Boolean(details?.actualStartTime)
          && !details?.actualEndTime;
        const hasEnded = Boolean(details?.actualEndTime)
          || (Boolean(details?.actualStartTime) && video.snippet?.liveBroadcastContent === "none");
        const title = video.snippet?.title?.trim();

        if (isActuallyLive) {
          const startsAt = details.actualStartTime ? new Date(details.actualStartTime) : new Date();
          await endOtherTenantLives(item.tenantId, item._id, startsAt);
          await LiveClass.updateOne(
            { _id: item._id, tenantId: item.tenantId, status: { $in: ["scheduled", "live"] } },
            { $set: { title: title || "Live class", status: "live", isActive: true, startsAt }, $unset: { endsAt: 1 } },
          );
        } else if (hasEnded || (item.status === "live" && details && video.snippet?.liveBroadcastContent !== "live")) {
          const endsAt = details?.actualEndTime ? new Date(details.actualEndTime) : new Date();
          await LiveClass.updateOne(
            { _id: item._id, tenantId: item.tenantId, status: { $in: ["scheduled", "live"] } },
            { $set: { title: title || "Live class", status: "ended", isActive: false, endsAt } },
          );
        } else if (title && item.status === "scheduled") {
          await LiveClass.updateOne({ _id: item._id, tenantId: item.tenantId, status: "scheduled" }, { $set: { title } });
        }
      }
    }
    return { configured: true, checked };
  } catch (error) {
    console.warn("[YouTube Live Sync] Status check failed; active states are unchanged:", error.message);
    return { configured: true, checked, error: error.message };
  } finally {
    isSyncing = false;
  }
}

export function startYouTubeLiveSync() {
  if (timer) return timer;
  const pollIntervalMs = Math.max(15_000, Number(process.env.YOUTUBE_LIVE_SYNC_INTERVAL_MS) || 30_000);
  if (!process.env.YOUTUBE_API_KEY?.trim()) return null;
  void syncYouTubeLiveClasses();
  timer = setInterval(() => { void syncYouTubeLiveClasses(); }, pollIntervalMs);
  timer.unref?.();
  console.info(`[YouTube Live Sync] Watching YouTube broadcast status every ${Math.round(pollIntervalMs / 1000)} seconds.`);
  return timer;
}
