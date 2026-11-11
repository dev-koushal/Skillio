export function buildYouTubeEmbedUrl(videoId, origin = typeof window !== "undefined" ? window.location.origin : "") {
  if (typeof videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return "";
  const params = new URLSearchParams({ controls: "1", playsinline: "1", rel: "0", enablejsapi: "1" });
  if (origin) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
