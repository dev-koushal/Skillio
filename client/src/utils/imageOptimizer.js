/**
 * Image Optimizer Utility for Cloudinary and Unsplash
 * Ensures minimal bandwidth consumption on 3G/4G/mobile connections.
 */

export function optimizeImage(url, width = 600) {
  if (!url || typeof url !== "string") {
    return "/skillio.png";
  }

  // 1. Cloudinary Optimization: inject auto format, auto quality, and width bounds
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // Avoid double transformation if already present
    if (url.includes("/f_auto,q_auto")) {
      return url;
    }
    const transform = `f_auto,q_auto,w_${width},c_limit`;
    return url.replace("/upload/", `/upload/${transform}/`);
  }

  // 2. Unsplash Optimization
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("q", "75");
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  return url;
}
