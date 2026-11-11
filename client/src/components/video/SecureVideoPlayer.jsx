import React, { useState, useEffect, useRef } from "react";
import { Loader2, Lock, AlertCircle, RefreshCw, Play, ShieldAlert } from "lucide-react";
import api from "../../services/api";
import YouTubePlayerFrame from "./YouTubePlayerFrame";

/**
 * Production-grade Secure Video Player.
 * Requests short-lived tokenized playback authorization on-demand.
 * Supports Bunny Stream adaptive video embedding and secured legacy streams.
 * Never stores tokens in localStorage or Redux.
 */
export default function SecureVideoPlayer({ lectureId, liveClassId = null, lectureTitle = "Lecture Video", onEnded = null }) {
  const [playback, setPlayback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");

  const expiryTimerRef = useRef(null);

  const fetchPlaybackAuthorization = async () => {
    const playbackEndpoint = liveClassId
      ? `/api/institution/live/${liveClassId}/playback`
      : lectureId ? `/api/lectures/${lectureId}/playback` : null;
    if (!playbackEndpoint) return;

    try {
      setLoading(true);
      setError(null);
      setIsExpired(false);
      setYoutubeError("");

      const res = await api.get(playbackEndpoint);

      if (res.data?.success && res.data?.playback?.authorized) {
        const pb = res.data.playback;
        setPlayback(pb);

        // Calculate token expiration timer to seamlessly prompt refresh
        if (pb.expiresAt) {
          const msUntilExpiry = new Date(pb.expiresAt).getTime() - Date.now();
          if (msUntilExpiry > 0) {
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = setTimeout(() => {
              setIsExpired(true);
            }, msUntilExpiry);
          }
        }
      } else {
        setError(res.data?.message || "You are not authorized to view this lecture.");
      }
    } catch (err) {
      console.warn("[SecureVideoPlayer Authorization Error]", err.response?.data?.message || err.message);
      setError(err.response?.data?.message || "Course access or enrollment required to watch this lecture.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybackAuthorization();

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      // Clean up in-memory playback reference on unmount
      setPlayback(null);
    };
  }, [lectureId, liveClassId]);

  const playerShell = "relative w-full aspect-video overflow-hidden rounded-2xl border border-[#e8e5dc] bg-[#111018] shadow-xs";

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
          loading="lazy"
          className="border-0 w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
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
          src={playback.streamUrl}
          controls
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

