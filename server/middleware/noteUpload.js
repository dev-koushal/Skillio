import multer from "multer";
import os from "os";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const uploadDir = path.join(os.tmpdir(), "skillio-note-uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const noteUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (file.fieldname === "file") {
      if (ext !== ".pdf" || file.mimetype !== "application/pdf") {
        return cb(new Error("Only PDF files are supported for study material."));
      }
    } else if (file.fieldname === "thumbnail") {
      const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedExts.includes(ext) || !allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Thumbnail must be an image (JPG, PNG, WebP)."));
      }
    }
    cb(null, true);
  },
});

export const noteUploadFields = noteUpload.fields([
  { name: "file", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

export default noteUploadFields;
