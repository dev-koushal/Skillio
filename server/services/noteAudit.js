import NoteAccessLog from "../models/noteAccessLogModel.js";

export async function logNoteAccess(req, { noteId = null, event, pageNumber = null, reason = "" }) {
  try {
    await NoteAccessLog.create({
      userId: req.userId,
      tenantId: req.tenantId,
      noteId,
      event,
      pageNumber,
      reason,
      ipAddress: String(req.ip || "").slice(0, 100),
      authSessionId: String(req.sessionId || "").slice(0, 120),
    });
  } catch (error) {
    console.error("[Note access audit failure]", error);
  }
}
