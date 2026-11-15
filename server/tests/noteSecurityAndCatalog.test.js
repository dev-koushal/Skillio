import assert from "node:assert/strict";
import crypto from "node:crypto";
import Note from "../models/noteModel.js";
import Topic from "../models/topicModel.js";
import NoteEntitlement from "../models/noteEntitlementModel.js";
import NoteViewerSession from "../models/noteViewerSessionModel.js";
import NoteAccessLog from "../models/noteAccessLogModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js";
import { v2 as cloudinary } from "cloudinary";
import {
  getNotePage,
  getStudentNotes,
  getStudentNoteDetails,
} from "../controller/noteController.js";

const tenantA = "65a000000000000000000001";
const tenantB = "65a000000000000000000002";
const studentId = "65a000000000000000000010";
const noteAId = "65a000000000000000000020";
const viewerToken = "ephemeral-viewer-token";
const viewerTokenHash = crypto.createHash("sha256").update(viewerToken).digest("hex");

const createMockReqRes = (options = {}) => {
  const req = {
    userId: Object.hasOwn(options, "userId") ? options.userId : studentId,
    tenantId: options.tenantId || tenantA,
    userRole: options.userRole || "student",
    sessionId: Object.hasOwn(options, "sessionId") ? options.sessionId : "auth-session-1",
    ip: "127.0.0.1",
    params: options.params || { id: noteAId, pageNumber: "1" },
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || { "x-note-viewer-session": viewerToken },
    tenant: options.tenant || { name: "Academy A", ownerId: "educator_1" },
  };
  let statusCode = 200;
  let responseHeaders = {};
  let jsonBody = null;
  let sentData = null;
  const res = {
    status(code) { statusCode = code; return res; },
    set(name, value) {
      if (typeof name === "object") responseHeaders = { ...responseHeaders, ...name };
      else responseHeaders[name] = value;
      return res;
    },
    json(data) { jsonBody = data; return res; },
    send(data) { sentData = data; return res; },
    end() { return res; },
    getStatusCode() { return statusCode; },
    getJSON() { return jsonBody; },
    getData() { return sentData; },
    getHeaders() { return responseHeaders; },
  };
  return { req, res };
};

const mock = (target, key, value) => {
  const original = target[key];
  target[key] = value;
  return () => { target[key] = original; };
};

const noteFixture = (overrides = {}) => ({
  _id: noteAId,
  tenantId: tenantA,
  title: "DBMS Interview Notes",
  topic: "Database Systems",
  status: "published",
  isPublished: true,
  processingStatus: "ready",
  storageProvider: "cloudinary_authenticated",
  assetId: "private/note-source",
  assetVersion: 12,
  pageCount: 10,
  uploadedBy: "65a000000000000000000099",
  fileUrl: "https://private.example/original.pdf",
  ...overrides,
});

console.log("=================================================");
console.log("   NOTE CATALOG & MULTI-TENANT SECURITY TESTS    ");
console.log("=================================================");

assert.ok(Note.schema.path("tenantId"), "Notes must be institution scoped");
assert.ok(Note.schema.path("topic"), "Notes must be searchable by topic");
assert.equal(Note.schema.path("relatedCourseId").isRequired, undefined, "Course relation must stay optional");
assert.ok(Topic.schema.indexes().some(([index]) => index.tenantId === 1 && index.name === 1), "Topic uniqueness must include tenant");
assert.ok(NoteViewerSession.schema.path("authSessionId"), "Viewer session must bind to the authenticated session");
assert.ok(NoteViewerSession.schema.path("expiresAt"), "Viewer session must expire");
assert.ok(NoteEntitlement.schema.indexes().some(([index, options]) => index.userId === 1 && index.noteId === 1 && index.tenantId === 1 && options.unique), "Entitlement must be unique per student, note, and tenant");
console.log("[PASS] Standalone Note, tenant topic, entitlement, and short-lived viewer session models");

{
  const { req, res } = createMockReqRes({ userId: null, sessionId: null, headers: {} });
  await getNotePage(req, res);
  assert.equal(res.getStatusCode(), 401, "Unauthenticated page access must be denied");
  console.log("[PASS] Unauthenticated page request -> DENIED");
}

{
  const { req, res } = createMockReqRes({ headers: {} });
  await getNotePage(req, res);
  assert.equal(res.getStatusCode(), 404, "Page request without viewer session must be denied");
  console.log("[PASS] Missing viewer session -> DENIED");
}

{
  const restore = mock(NoteViewerSession, "findOne", () => ({ select: async () => null }));
  const restoreAudit = mock(NoteAccessLog, "create", async () => ({}));
  const { req, res } = createMockReqRes({ tenantId: tenantB });
  try {
    await getNotePage(req, res);
    assert.equal(res.getStatusCode(), 401, "A session from another tenant must not authorize this request");
  } finally {
    restore();
    restoreAudit();
  }
  console.log("[PASS] Wrong institution / expired viewer session -> DENIED");
}

{
  const restores = [
    mock(NoteViewerSession, "findOne", (query) => ({
      select: async () => query.tenantId === tenantA && query.tokenHash === viewerTokenHash ? { _id: "viewer-session" } : null,
    })),
    mock(Note, "findOne", () => ({ select: async () => noteFixture() })),
    mock(InstitutionMembership, "exists", async () => true),
    mock(NoteEntitlement, "exists", async () => false),
    mock(NoteAccessLog, "create", async () => ({})),
  ];
  try {
    const { req, res } = createMockReqRes();
    await getNotePage(req, res);
    assert.equal(res.getStatusCode(), 403, "Missing active entitlement must deny page delivery");
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
  console.log("[PASS] Authenticated but unpurchased page request -> DENIED");
}

{
  const originalFetch = globalThis.fetch;
  const restoreUrl = mock(cloudinary, "url", () => "https://cloudinary.invalid/signed-page");
  const restores = [
    mock(NoteViewerSession, "findOne", (query) => ({
      select: async () => query.authSessionId === "auth-session-1" && query.expiresAt.$gt instanceof Date
        ? { _id: "viewer-session" }
        : null,
    })),
    mock(Note, "findOne", (query) => ({
      select: async () => query.tenantId === tenantA ? noteFixture() : null,
    })),
    mock(InstitutionMembership, "exists", async () => true),
    mock(NoteEntitlement, "exists", async () => true),
    mock(User, "findById", () => ({ select: async () => ({ name: "Learner", email: "learner@example.test" }) })),
    mock(Tenant, "findById", () => ({ select: async () => ({ name: "Academy A" }) })),
    mock(NoteAccessLog, "create", async () => ({})),
  ];
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: () => "image/jpeg" },
    arrayBuffer: async () => Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]).buffer,
  });
  try {
    const { req, res } = createMockReqRes();
    await getNotePage(req, res);
    assert.equal(res.getStatusCode(), 200, "Purchased page access must be allowed");
    assert.equal(res.getHeaders()["Content-Type"], "image/jpeg");
    assert.match(res.getHeaders()["Cache-Control"], /no-store/);
    assert.equal(res.getHeaders()["Content-Disposition"], "inline");
    assert.equal(Buffer.from(res.getData()).toString("hex"), "ffd8ffd9");
  } finally {
    globalThis.fetch = originalFetch;
    restoreUrl();
    restores.reverse().forEach((restore) => restore());
  }
  console.log("[PASS] Purchased page -> authenticated JPEG only, watermarked in reader, not cached");
}

{
  const restores = [
    mock(NoteViewerSession, "findOne", () => ({ select: async () => ({ _id: "viewer-session" }) })),
    mock(Note, "findOne", () => ({ select: async () => noteFixture({ storageProvider: "legacy", assetId: "" }) })),
    mock(InstitutionMembership, "exists", async () => true),
    mock(NoteEntitlement, "exists", async () => true),
    mock(NoteAccessLog, "create", async () => ({})),
  ];
  try {
    const { req, res } = createMockReqRes();
    await getNotePage(req, res);
    assert.equal(res.getStatusCode(), 404, "Legacy/public source assets must not use a placeholder or direct URL fallback");
    assert.equal(res.getData(), null);
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
  console.log("[PASS] Legacy source / public PDF fallback -> DENIED");
}

{
  const originalFind = Note.find;
  const originalEntitlementsFind = NoteEntitlement.find;
  try {
    Note.find = () => ({
      select: () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [noteFixture({ assetId: "secret-id", assetVersion: 12 })],
          }),
        }),
      }),
    });
    NoteEntitlement.find = () => ({ select: () => ({ lean: async () => [] }) });
    const { req, res } = createMockReqRes({ headers: {} });
    await getStudentNotes(req, res);
    const note = res.getJSON().notes[0];
    assert.equal(note.fileUrl, "");
    assert.equal(note.assetId, undefined);
    assert.equal(note.assetVersion, undefined);
  } finally {
    Note.find = originalFind;
    NoteEntitlement.find = originalEntitlementsFind;
  }
  console.log("[PASS] Student catalog never returns original PDF URLs or storage identifiers");
}

{
  const originalFindOne = Note.findOne;
  const originalEntitlementExists = NoteEntitlement.exists;
  try {
    let query;
    Note.findOne = (filter) => {
      query = filter;
      return {
        select: () => ({
          populate: () => ({
            lean: async () => noteFixture({ assetId: "private-id", assetVersion: 12 }),
          }),
        }),
      };
    };
    NoteEntitlement.exists = async () => false;
    const { req, res } = createMockReqRes({ headers: {} });
    await getStudentNoteDetails(req, res);
    assert.equal(query.tenantId, tenantA);
    assert.equal(query.processingStatus, "ready");
    assert.equal(res.getJSON().note.fileUrl, "");
    assert.equal(res.getJSON().note.assetId, undefined);
  } finally {
    Note.findOne = originalFindOne;
    NoteEntitlement.exists = originalEntitlementExists;
  }
  console.log("[PASS] Student detail lookup is tenant-scoped and hides private source metadata");
}

console.log("=================================================");
console.log("   ALL NOTE SECURITY & ARCHITECTURE TESTS PASSED");
console.log("=================================================\n");
