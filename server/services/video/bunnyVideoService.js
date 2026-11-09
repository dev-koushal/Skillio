import crypto from "crypto";
import fs from "fs";

/**
 * Bunny Stream Video Service.
 * Manages video upload, processing status, and short-lived SHA-256 signed playback tokens.
 */
class BunnyVideoService {
  constructor() {
    this.apiKey = process.env.BUNNY_API_KEY;
    this.libraryId = process.env.BUNNY_LIBRARY_ID;
    this.cdnHostname = process.env.BUNNY_CDN_HOSTNAME || "video.bunnycdn.com";
    this.signingKey = process.env.BUNNY_VIDEO_SIGNING_KEY || "skillio_token_key_dev";
    this.defaultTtl = Number(process.env.VIDEO_PLAYBACK_TOKEN_TTL) || 300; // 5 minutes default
  }

  isConfigured() {
    return Boolean(this.apiKey && this.libraryId);
  }

  /**
   * Create a new video entry in Bunny Stream Video Library.
   *
   * @param {string} title
   * @returns {Promise<{ videoId: string, libraryId: string }>}
   */
  async createVideo(title = "Lecture Video") {
    if (!this.isConfigured()) {
      // Deterministic Mock mode for local dev/testing
      const mockGuid = `bunny_mock_${crypto.randomUUID()}`;
      return {
        videoId: mockGuid,
        libraryId: this.libraryId || "mock_lib_01",
        status: "ready",
      };
    }

    try {
      const response = await fetch(`https://video.bunnycdn.com/library/${this.libraryId}/videos`, {
        method: "POST",
        headers: {
          AccessKey: this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Bunny video creation failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      return {
        videoId: data.guid,
        libraryId: this.libraryId,
        status: "uploading",
      };
    } catch (err) {
      console.error("[Bunny createVideo Error]", err.message);
      throw err;
    }
  }

  /**
   * Upload video binary stream or file to Bunny Stream.
   *
   * @param {string} videoId
   * @param {string|Buffer} fileInput - file path or buffer
   * @returns {Promise<{ success: boolean, status: string }>}
   */
  async uploadVideo(videoId, fileInput) {
    if (!this.isConfigured()) {
      return { success: true, status: "ready" };
    }

    try {
      let body;
      if (typeof fileInput === "string") {
        body = fs.createReadStream(fileInput);
      } else {
        body = fileInput;
      }

      const response = await fetch(
        `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`,
        {
          method: "PUT",
          headers: {
            AccessKey: this.apiKey,
            "Content-Type": "application/octet-stream",
          },
          body,
          duplex: "half",
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Bunny video upload failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      return {
        success: data.success ?? true,
        status: "processing",
      };
    } catch (err) {
      console.error("[Bunny uploadVideo Error]", err.message);
      throw err;
    }
  }

  /**
   * Get current video transcoding and processing status from Bunny.
   *
   * @param {string} videoId
   * @returns {Promise<string>} - 'uploading' | 'processing' | 'ready' | 'failed'
   */
  async getVideoStatus(videoId) {
    if (!this.isConfigured() || videoId.startsWith("bunny_mock_")) {
      return "ready";
    }

    try {
      const response = await fetch(
        `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`,
        {
          method: "GET",
          headers: {
            AccessKey: this.apiKey,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) return "failed";

      const data = await response.json();
      // Bunny status codes: 0 = Created, 1 = Uploaded, 2 = Processing, 3 = Transcoding, 4 = Ready, 5 = Failed
      switch (data.status) {
        case 0:
        case 1:
          return "uploading";
        case 2:
        case 3:
          return "processing";
        case 4:
          return "ready";
        case 5:
          return "failed";
        default:
          return "processing";
      }
    } catch (err) {
      console.error("[Bunny getVideoStatus Error]", err.message);
      return "processing";
    }
  }

  /**
   * Generate short-lived SHA-256 Token Authentication credentials for playback.
   *
   * @param {Object} params
   * @param {string} params.videoId
   * @param {string} [params.libraryId]
   * @param {number} [params.ttlSeconds]
   * @returns {{ token: string, expires: number, expiresAt: string, embedUrl: string, hlsUrl: string }}
   */
  generatePlaybackToken({ videoId, libraryId = null, ttlSeconds = null }) {
    const libId = libraryId || this.libraryId || "mock_lib";
    const ttl = Number(ttlSeconds) || this.defaultTtl;
    const expires = Math.floor(Date.now() / 1000) + ttl;

    // Standard Bunny Stream Token Authentication: SHA256(securityKey + videoId + expires)
    const token = crypto
      .createHash("sha256")
      .update(this.signingKey + videoId + expires)
      .digest("hex");

    const embedUrl = `https://iframe.mediadelivery.net/embed/${libId}/${videoId}?token=${token}&expires=${expires}`;
    const hlsUrl = `https://${this.cdnHostname}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;

    return {
      token,
      expires,
      expiresAt: new Date(expires * 1000).toISOString(),
      embedUrl,
      hlsUrl,
    };
  }
}

const bunnyVideoService = new BunnyVideoService();
export default bunnyVideoService;
