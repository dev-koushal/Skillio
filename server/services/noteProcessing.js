import { v2 as cloudinary } from "cloudinary";
import Note from "../models/noteModel.js";

export async function commitPendingNoteAsset(noteId, assetId, assetVersion = 0) {
  const note = await Note.findOne({ _id: noteId, pendingAssetId: assetId }).select(
    "+assetId +pendingAssetId +pendingPageCount +pendingFileName +pendingFileSize"
  );
  if (!note) return false;
  const previousAssetId = note.assetId;
  const result = await Note.updateOne(
    { _id: noteId, pendingAssetId: assetId },
    {
      $set: {
        assetId,
        assetVersion,
        pageCount: note.pendingPageCount,
        fileName: note.pendingFileName,
        fileSize: note.pendingFileSize,
        storageProvider: "cloudinary_authenticated",
        processingStatus: "ready",
        replacementProcessing: false,
      },
      $unset: {
        pendingAssetId: "",
        pendingAssetVersion: "",
        pendingPageCount: "",
        pendingFileName: "",
        pendingFileSize: "",
      },
    }
  );
  if (result.modifiedCount && previousAssetId && previousAssetId !== assetId) {
    await cloudinary.uploader.destroy(previousAssetId, {
      resource_type: "image",
      type: "authenticated",
    }).catch((error) => console.warn("[Note PDF replacement cleanup]", error.message));
  }
  return Boolean(result.modifiedCount);
}

export async function failPendingNoteAsset(noteId, assetId) {
  const note = await Note.findOne({ _id: noteId, pendingAssetId: assetId }).select("+assetId");
  if (!note) return false;
  const result = await Note.updateOne(
    { _id: noteId, pendingAssetId: assetId },
    {
      $set: {
        processingStatus: note.assetId ? "ready" : "failed",
        replacementProcessing: false,
      },
      $unset: {
        pendingAssetId: "",
        pendingAssetVersion: "",
        pendingPageCount: "",
        pendingFileName: "",
        pendingFileSize: "",
      },
    }
  );
  return Boolean(result.modifiedCount);
}

export async function completeNotePdfProcessing({ assetId, succeeded, assetVersion }) {
  const note = await Note.findOne({
    $or: [
      { assetId, processingStatus: "processing" },
      { pendingAssetId: assetId, replacementProcessing: true },
    ],
  }).select("+assetId +assetVersion +pendingAssetId +pendingAssetVersion +pendingPageCount +pendingFileName +pendingFileSize");
  if (!note) return false;

  if (note.pendingAssetId === assetId) {
    if (succeeded) await commitPendingNoteAsset(note._id, assetId, assetVersion);
    else await failPendingNoteAsset(note._id, assetId);
    return true;
  }

  const update = succeeded
    ? { processingStatus: "ready", ...(Number.isSafeInteger(assetVersion) ? { assetVersion } : {}) }
    : { processingStatus: "failed", status: "draft", isPublished: false };
  await Note.updateOne(
    { _id: note._id, assetId, processingStatus: "processing" },
    { $set: update }
  );
  return true;
}
