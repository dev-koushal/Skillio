import multer from "multer";
import os from "os";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const directory = path.join(os.tmpdir(), "skillio-protected-pdf-uploads");
fs.mkdirSync(directory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: directory,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname || "").toLowerCase()}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

export default upload.single("file");
