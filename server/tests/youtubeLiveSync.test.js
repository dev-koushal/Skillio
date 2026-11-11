import assert from "node:assert/strict";
import LiveClass from "../models/liveClassModel.js";
import { syncYouTubeLiveClasses } from "../services/youtubeLiveSync.js";

const originals = {
  find: LiveClass.find,
  updateMany: LiveClass.updateMany,
  updateOne: LiveClass.updateOne,
  fetch: globalThis.fetch,
  apiKey: process.env.YOUTUBE_API_KEY,
};

const records = [{
  _id: "live-class-a",
  tenantId: "tenant-a",
  youtubeVideoId: "abcdefghijk",
  status: "scheduled",
  isActive: false,
  startsAt: null,
}];
let youtubeVideo = {
  id: "abcdefghijk",
  snippet: { title: "Current Electricity", liveBroadcastContent: "upcoming" },
  liveStreamingDetails: { scheduledStartTime: "2026-11-11T10:00:00Z" },
};

try {
  process.env.YOUTUBE_API_KEY = "test-key";
  LiveClass.find = () => ({
    select() { return this; },
    lean: async () => records.map((record) => ({ ...record })),
  });
  LiveClass.updateMany = async (filter, update) => {
    records.filter((record) => record.tenantId === filter.tenantId && record._id !== filter._id.$ne)
      .forEach((record) => Object.assign(record, update.$set));
  };
  LiveClass.updateOne = async (filter, update) => {
    const record = records.find((candidate) => candidate._id === filter._id && candidate.tenantId === filter.tenantId);
    if (record) {
      Object.assign(record, update.$set || {});
      for (const key of Object.keys(update.$unset || {})) delete record[key];
    }
  };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ items: [youtubeVideo] }) });

  await syncYouTubeLiveClasses();
  assert.equal(records[0].status, "scheduled", "an upcoming stream must not be advertised as live");
  assert.equal(records[0].title, "Current Electricity", "the YouTube title is populated without educator input");

  youtubeVideo = {
    ...youtubeVideo,
    snippet: { ...youtubeVideo.snippet, liveBroadcastContent: "live" },
    liveStreamingDetails: { actualStartTime: "2026-11-11T10:02:00Z" },
  };
  await syncYouTubeLiveClasses();
  assert.equal(records[0].status, "live");
  assert.equal(records[0].isActive, true);

  youtubeVideo = {
    ...youtubeVideo,
    snippet: { ...youtubeVideo.snippet, liveBroadcastContent: "none" },
    liveStreamingDetails: { actualStartTime: "2026-11-11T10:02:00Z", actualEndTime: "2026-11-11T10:42:00Z" },
  };
  await syncYouTubeLiveClasses();
  assert.equal(records[0].status, "ended");
  assert.equal(records[0].isActive, false, "an ended YouTube stream must clear the live alert");
  console.log("[PASS] YouTube live sync waits for broadcast start and automatically clears ended streams");
} finally {
  LiveClass.find = originals.find;
  LiveClass.updateMany = originals.updateMany;
  LiveClass.updateOne = originals.updateOne;
  globalThis.fetch = originals.fetch;
  if (originals.apiKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originals.apiKey;
}
