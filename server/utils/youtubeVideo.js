const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

export class YouTubeUrlError extends Error {
  constructor(message = "Enter a valid YouTube video URL.") {
    super(message);
    this.name = "YouTubeUrlError";
    this.status = 400;
  }
}

/** Parse a supported YouTube video link and return only its ID and canonical URL. */
export function parseYouTubeVideoUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048 || /[<>\u0000-\u001f]/.test(value)) {
    throw new YouTubeUrlError();
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new YouTubeUrlError();
  }

  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    !YOUTUBE_HOSTS.has(host) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new YouTubeUrlError("Use a secure YouTube video link from youtube.com or youtu.be.");
  }

  let videoId = "";
  if (host === "youtu.be") {
    const shortLink = url.pathname.match(/^\/([^/]+)\/?$/);
    videoId = shortLink?.[1] || "";
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") || "";
  } else {
    const match = url.pathname.match(/^\/(?:embed|live)\/([^/]+)\/?$/);
    videoId = match?.[1] || "";
  }

  if (!VIDEO_ID_PATTERN.test(videoId)) throw new YouTubeUrlError();
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function youtubeEmbedUrl(videoId, origin = "") {
  if (typeof videoId !== "string" || !VIDEO_ID_PATTERN.test(videoId)) {
    throw new YouTubeUrlError();
  }
  const params = new URLSearchParams({ controls: "1", playsinline: "1", rel: "0", enablejsapi: "1" });
  if (origin) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
