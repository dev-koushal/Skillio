import React, { useState, useEffect, useRef } from "react";
import { Loader2, Lock, AlertCircle, RefreshCw, Play, ShieldAlert, ExternalLink } from "lucide-react";
import api from "../../services/api";
import YouTubePlayerFrame from "./YouTubePlayerFrame";
import {
  handleFullscreenOrientationChange,
  lockLandscapeOrientation,
  unlockScreenOrientation,
} from "../../utils/videoOrientation";

// In-memory session cache for short-lived token authorizations (cleared on page reload / session end)
// Never stored in persistent storage (localStorage / Redux)
const playbackAuthCache = new Map();

/**
 * Production-grade Secure Video Player.
 * Requests short-lived tokenized playback authorization on-demand.
 * Supports Bunny Stream adaptive video embedding and secured legacy streams.
 * Never stores tokens in localStorage or Redux.
 */
export default function SecureVideoPlayer({
  lectureId,
  liveClassId = null,
  lectureTitle = "Lecture Video",
  initialPlayback = null,
  onEnded = null,
}) {
  const targetId = liveClassId || lectureId;

  // Use initialPlayback or active valid cache entry if available for immediate startup
  const initialValidPlayback = (() => {
    if (initialPlayback?.authorized) return initialPlayback;
    const cached = playbackAuthCache.get(targetId);
    if (cached && cached.expiresAtMs > Date.now() + 30000) return cached.data;
    return null;
  })();

  const [playback, setPlayback] = useState(initialValidPlayback);
  const [loading, setLoading] = useState(!initialValidPlayback);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");

  const expiryTimerRef = useRef(null);
  const videoRef = useRef(null);

  // Automatically lock mobile screen to landscape on video enlarge / fullscreen
  useEffect(() => {
    const onFsChange = () => {
      handleFullscreenOrientationChange();
    };

    const fsEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    fsEvents.forEach((evt) => document.addEventListener(evt, onFsChange));

    return () => {
      fsEvents.forEach((evt) => document.removeEventListener(evt, onFsChange));
      unlockScreenOrientation();
    };
  }, []);

  // WebKit iOS native player fullscreen events for direct video element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onWebkitBegin = () => lockLandscapeOrientation();
    const onWebkitEnd = () => unlockScreenOrientation();

    videoEl.addEventListener("webkitbeginfullscreen", onWebkitBegin);
    videoEl.addEventListener("webkitendfullscreen", onWebkitEnd);

    return () => {
      videoEl.removeEventListener("webkitbeginfullscreen", onWebkitBegin);
      videoEl.removeEventListener("webkitendfullscreen", onWebkitEnd);
    };
  }, [playback?.streamUrl]);

  const scheduleExpiry = (expiresAt) => {
    if (!expiresAt) return;
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    if (msUntilExpiry > 0) {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = setTimeout(() => {
        playbackAuthCache.delete(targetId);
        setIsExpired(true);
      }, msUntilExpiry);
    }
  };

  const fetchPlaybackAuthorization = async (silent = false) => {
    // 1. Check in-memory cache for valid short-lived authorization
    const cached = playbackAuthCache.get(targetId);
    if (cached && cached.expiresAtMs > Date.now() + 30000) {
      setPlayback(cached.data);
      setLoading(false);
      setError(null);
      setIsExpired(false);
      scheduleExpiry(cached.data.expiresAt);
      return;
    }

    const playbackEndpoint = liveClassId
      ? `/api/institution/live/${liveClassId}/playback`
      : lectureId ? `/api/lectures/${lectureId}/playback` : null;
    if (!playbackEndpoint) return;

    try {
      if (!silent) setLoading(true);
      setError(null);
      setIsExpired(false);
      setYoutubeError("");

      const res = await api.get(playbackEndpoint);

      if (res.data?.success && res.data?.playback?.authorized) {
        const pb = res.data.playback;
        setPlayback(pb);
        playbackAuthCache.set(targetId, {
          data: pb,
          expiresAtMs: pb.expiresAt ? new Date(pb.expiresAt).getTime() : Date.now() + 300000,
        });

        // Calculate token expiration timer to seamlessly prompt refresh
        scheduleExpiry(pb.expiresAt);
      } else {
        setError(res.data?.message || "You are not authorized to view this lecture.");
      }
    } catch (err) {
      console.warn("[SecureVideoPlayer Authorization Error]", err.response?.data?.message || err.message);
      setError(err.response?.data?.message || "Course access or enrollment required to watch this lecture.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // If initialPlayback was provided and authorized, cache and schedule expiry immediately
    if (initialPlayback?.authorized) {
      playbackAuthCache.set(targetId, {
        data: initialPlayback,
        expiresAtMs: initialPlayback.expiresAt ? new Date(initialPlayback.expiresAt).getTime() : Date.now() + 300000,
      });
      scheduleExpiry(initialPlayback.expiresAt);
      setLoading(false);
      return;
    }

    fetchPlaybackAuthorization();

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [lectureId, liveClassId]);

  // Auto-poll video status while Bunny transcodes in the background
  useEffect(() => {
    if (playback?.processingStatus === "processing" || playback?.processingStatus === "uploading") {
      const pollTimer = setTimeout(() => {
        fetchPlaybackAuthorization(true);
      }, 2500);
      return () => clearTimeout(pollTimer);
    }
  }, [playback?.processingStatus]);

  const playerShell = "relative w-full h-full overflow-hidden bg-[#111018]";

  // Loading State
  if (loading) {
    return (
      <div role="status" className={`${playerShell} flex flex-col items-center justify-center space-y-3 p-5 text-center text-white select-none`}>
        <Loader2 className="w-8 h-8 text-[#60a5fa] animate-spin" />
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Authorizing Secure Stream...
        </p>
      </div>
    );
  }

  // Token Expired State
  if (isExpired) {
    return (
      <div role="status" className={`${playerShell} flex flex-col items-center justify-center space-y-3 p-5 text-center text-white`}>
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm text-slate-100">Playback Authorization Expired</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          For your security, video session tokens are short-lived. Click below to refresh your stream authorization.
        </p>
        <button
          onClick={fetchPlaybackAuthorization}
          className="inline-flex items-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh Video Authorization</span>
        </button>
      </div>
    );
  }

  // Processing State (Bunny Transcoding)
  if (playback && playback.processingStatus === "processing") {
    return (
      <div role="status" className={`${playerShell} flex flex-col items-center justify-center space-y-3 p-5 text-center text-white`}>
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <h4 className="font-bold text-sm text-slate-100">Video Processing in Progress</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          This lecture was recently uploaded and is being transcoded into adaptive bitrate streams. Please check back in a few moments.
        </p>
        <button
          onClick={fetchPlaybackAuthorization}
          className="inline-flex items-center gap-1.5 text-xs text-[#60a5fa] hover:underline cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Check Status</span>
        </button>
      </div>
    );
  }

  // Authorization Denied State
  if (error || !playback || !playback.authorized) {
    return (
      <div className="w-full aspect-video bg-[#0f172a] rounded-2xl flex flex-col items-center justify-center text-white space-y-3 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm text-slate-100">Lecture Access Locked</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          {error || "Enrollment in this course is required to view classroom lectures."}
        </p>
      </div>
    );
  }

  // Bunny Stream Adaptive Player
  if (playback.videoProvider === "bunny" && playback.embedUrl) {
    return (
      <div className={playerShell}>
        <iframe
          src={playback.embedUrl}
          loading="eager"
          className="border-0 w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={lectureTitle}
        />
      </div>
    );
  }

  if (playback.videoProvider === "youtube" && playback.youtubeVideoId) {
    return (
      <div className={playerShell}>
        <YouTubePlayerFrame
          key={playback.youtubeVideoId}
          videoId={playback.youtubeVideoId}
          title={lectureTitle || playback.title || "Skillio video"}
          isLive={Boolean(playback.isLive)}
          onEnded={onEnded}
          onError={setYoutubeError}
        />
        {youtubeError && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#111018]/95 p-5 text-center text-white">
            <AlertCircle size={22} className="text-amber-300" aria-hidden="true" />
            <p className="max-w-sm text-sm font-semibold">Video unavailable</p>
            <p className="max-w-sm text-xs text-white/75">{youtubeError}</p>
            {playback.youtubeLiveUrl && (
              <a
                href={playback.youtubeLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
              >
                <span>Watch on YouTube</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // Authorized Direct / Legacy Cloudinary Stream
  if (playback.streamUrl) {
    return (
      <div className={playerShell}>
        <video
          ref={videoRef}
          src={playback.streamUrl}
          controls
          preload="auto"
          playsInline
          webkit-playsinline="true"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onEnded={onEnded}
          className="w-full h-full object-contain"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div role="status" className={`${playerShell} flex items-center justify-center text-xs text-slate-300`}>
      Video currently unavailable
    </div>
  );
}

