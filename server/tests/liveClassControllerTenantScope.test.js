import assert from "node:assert/strict";
import LiveClass from "../models/liveClassModel.js";
import { createLiveClass, getLiveClassPlayback, activateLiveClass, cancelLiveClass } from "../controller/liveClassController.js";

const originalFindOne = LiveClass.findOne;
const originalUpdateMany = LiveClass.updateMany;
const originalCreate = LiveClass.create;
const originalApiKey = process.env.YOUTUBE_API_KEY;
const response = () => ({ statusCode: 200, data: null, status(code) { this.statusCode = code; return this; }, json(body) { this.data = body; return this; } });

try {
  let playbackFilter;
  LiveClass.findOne = (filter) => {
    playbackFilter = filter;
    return { select: () => ({ lean: async () => null }) };
  };
  const denied = response();
  await getLiveClassPlayback({ params: { liveClassId: "class-from-tenant-b" }, tenantId: "tenant-a" }, denied);
  assert.deepEqual(playbackFilter, {
    _id: "class-from-tenant-b",
    tenantId: "tenant-a",
    isActive: true,
    status: "live",
  });
  assert.equal(denied.statusCode, 404);
  assert.equal(denied.data.playback, undefined);
  console.log("[PASS] Live playback is institution-scoped and inactive/foreign classes are not returned");

  const target = {
    _id: "class-a",
    tenantId: "tenant-a",
    status: "scheduled",
    isActive: false,
    startsAt: null,
    endsAt: null,
    save: async function () { return this; },
  };
  LiveClass.findOne = async (filter) => {
    assert.deepEqual(filter, { _id: "class-a", tenantId: "tenant-a" });
    return target;
  };
  let deactivationFilter;
  LiveClass.updateMany = async (filter) => { deactivationFilter = filter; };
  const activated = response();
  await activateLiveClass({ params: { liveClassId: "class-a" }, tenantId: "tenant-a" }, activated);
  assert.deepEqual(deactivationFilter, { tenantId: "tenant-a", isActive: true, _id: { $ne: "class-a" } });
  assert.equal(target.status, "live");
  assert.equal(target.isActive, true);
  assert.ok(target.startsAt instanceof Date);
  assert.equal(activated.statusCode, 200);
  console.log("[PASS] Activating a live class only ends another active session in the same institution");

  delete process.env.YOUTUBE_API_KEY;
  LiveClass.findOne = () => ({ select: async () => null });
  LiveClass.create = async (document) => ({ _id: "manual-live", ...document });
  const createdWithoutApiKey = response();
  await createLiveClass({
    body: { youtubeLiveUrl: "https://www.youtube.com/live/Nq2wYIWFucg" },
    tenantId: "tenant-a",
    userId: "educator-a",
  }, createdWithoutApiKey);
  assert.equal(createdWithoutApiKey.statusCode, 201, "educators can add links without a YouTube API key");
  assert.equal(createdWithoutApiKey.data.liveClass.status, "scheduled");

  const activeTarget = {
    _id: "manual-live",
    tenantId: "tenant-a",
    status: "live",
    isActive: true,
    endsAt: null,
    save: async function () { return this; },
  };
  LiveClass.findOne = async () => activeTarget;
  const removedLive = response();
  await cancelLiveClass({ params: { liveClassId: "manual-live" }, tenantId: "tenant-a" }, removedLive);
  assert.equal(removedLive.statusCode, 200);
  assert.equal(activeTarget.status, "ended");
  assert.equal(activeTarget.isActive, false);
  assert.ok(activeTarget.endsAt instanceof Date);
  console.log("[PASS] Educators can create a link without API configuration and end/remove an active student alert");
} finally {
  if (originalApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originalApiKey;
  LiveClass.findOne = originalFindOne;
  LiveClass.updateMany = originalUpdateMany;
  LiveClass.create = originalCreate;
}
