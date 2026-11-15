import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromFile } from "file-type";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { v2 as cloudinary } from "cloudinary";
import "../config/cloudinary.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PAGES = 120;
const MAX_PAGE_BYTES = 12 * 1024 * 1024;

export async function inspectProtectedPdf(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (extension !== ".pdf" || file.size > MAX_FILE_SIZE) {
    throw new Error("Choose a PDF file smaller than 25 MB.");
  }

  const detected = await fileTypeFromFile(file.path).catch(() => null);
  const bytes = await fs.readFile(file.path);
  const head = bytes.subarray(0, Math.min(bytes.length, 4096)).toString("latin1");
  const tail = bytes.subarray(Math.max(0, bytes.length - 4096)).toString("latin1");
  const headerOffset = head.indexOf("%PDF-");
  const hasPdfSignature = headerOffset >= 0 && headerOffset <= 1024 && tail.includes("%%EOF");
  if (!hasPdfSignature && detected?.mime !== "application/pdf") {
    throw new Error("This file is not a supported, valid PDF.");
  }

  let document;
  let loadingTask;
  try {
    loadingTask = getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    });
    document = await loadingTask.promise;
    const [hasJSActions, attachments] = await Promise.all([
      document.hasJSActions?.() ?? false,
      document.getAttachments?.() ?? null,
    ]);
    if (hasJSActions || (attachments && Object.keys(attachments).length > 0)) {
      throw new Error("PDFs containing scripts or embedded files are not supported.");
    }
    if (!Number.isSafeInteger(document.numPages) || document.numPages < 1 || document.numPages > MAX_PAGES) {
      throw new Error(`PDFs must contain between 1 and ${MAX_PAGES} pages.`);
    }
    return { pageCount: document.numPages, fileSize: file.size };
  } catch (error) {
    if (error.message.startsWith("PDFs ") || error.message.startsWith("Choose ")) throw error;
    throw new Error(error.message || "This PDF is damaged or could not be processed.");
  } finally {
    try {
      await document?.cleanup?.();
    } catch {}
    try {
      await loadingTask?.destroy?.();
    } catch {}
  }
}

export async function uploadProtectedPdf({ filePath, tenantId, kind = "note", pageCount, assetId = "" }) {
  if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Secure PDF storage is not configured.");
  }
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > MAX_PAGES) {
    throw new Error("The PDF page count is not valid.");
  }

  const resolvedAssetId = assetId || `skillio/protected-${kind}s/${tenantId}/${crypto.randomUUID()}`;
  const notificationUrl = process.env.CLOUDINARY_EAGER_WEBHOOK_URL?.trim() ||
    (process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "")}/api/resource/cloudinary-eager-webhook`
      : "");
  const eager = Array.from({ length: pageCount }, (_, index) => ({
    transformation: [{ page: index + 1, width: 1600, crop: "limit" }],
    format: "jpg",
  }));

  try {
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
      type: "authenticated",
      format: "pdf",
      public_id: resolvedAssetId,
      overwrite: false,
      eager,
      eager_async: Boolean(notificationUrl),
      ...(notificationUrl ? { eager_notification_url: notificationUrl } : {}),
    });

    if (!notificationUrl && (
      !Array.isArray(uploadResult.eager) ||
      uploadResult.eager.length !== pageCount ||
      uploadResult.eager.some((result) => !result.secure_url || result.status === "failed")
    )) {
      await cloudinary.uploader.destroy(resolvedAssetId, { resource_type: "image", type: "authenticated" });
      throw new Error("We could not process this PDF. Please try another file.");
    }

    return {
      assetId: resolvedAssetId,
      assetVersion: Number(uploadResult.version) || 0,
      processingStatus: notificationUrl ? "processing" : "ready",
    };
  } catch (error) {
    await cloudinary.uploader.destroy(resolvedAssetId, { resource_type: "image", type: "authenticated" }).catch(() => {});
    if (error.message.includes("could not process")) throw error;
    throw new Error("Secure PDF upload failed. Please try again.");
  }
}

export async function fetchProtectedPdfPage({ assetId, assetVersion, page }) {
  const signedUrl = cloudinary.url(assetId, {
    secure: true,
    resource_type: "image",
    type: "authenticated",
    version: assetVersion || undefined,
    format: "jpg",
    sign_url: true,
    transformation: [{ page, width: 1600, crop: "limit" }],
  });
  const response = await fetch(signedUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("image/jpeg")) {
    throw new Error("Protected page is not available.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PAGE_BYTES) {
    throw new Error("Protected page response has an invalid size.");
  }
  return bytes;
}
