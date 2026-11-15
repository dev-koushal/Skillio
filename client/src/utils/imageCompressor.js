import api from "../services/api";

/**
 * In-browser Image Compressor & Optimizer
 * Resizes and compresses images via Canvas before uploading.
 * Bypasses Base64 to prevent memory leaks and payload bloat.
 */
export async function compressImage(file, {
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.82,
  mimeType = "image/jpeg",
  maxSizeBytes = 10 * 1024 * 1024,
} = {}) {
  if (!file || !(file instanceof Blob)) return file;

  // Reject files over 10MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed is ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB.`);
  }

  // Already optimized small image
  if (file.size < 120 * 1024 && (file.type === "image/jpeg" || file.type === "image/webp")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Direct File Upload to Cloudinary (Browser -> Cloudinary CDN)
 * Completely eliminates routing large binary uploads through the Skillio Node.js server.
 */
export async function directUploadImage(file, {
  folder = "skillio",
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.82,
} = {}) {
  // 1. In-browser compression
  const optimizedFile = await compressImage(file, { maxWidth, maxHeight, quality });

  // 2. Fetch signed parameters from backend
  const { data: sig } = await api.get(`/api/upload/cloudinary-signature?folder=${encodeURIComponent(folder)}`);
  if (!sig?.signature || !sig?.cloudName || !sig?.apiKey) {
    throw new Error("Direct upload signature unavailable");
  }

  // 3. Direct POST to Cloudinary API
  const formData = new FormData();
  formData.append("file", optimizedFile);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", sig.timestamp);
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Direct upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.secure_url;
}
