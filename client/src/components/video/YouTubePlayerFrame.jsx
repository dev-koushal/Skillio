import React, { useEffect, useId, useRef } from "react";
import { buildYouTubeEmbedUrl } from "../../utils/youtubeVideo";

let youtubeApiPromise;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("YouTube player controls could not initialize.")), 12000);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player controls could not initialize."));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube player controls could not initialize."));
      };
      document.head.appendChild(script);
    }
  }).catch((error) => {
    youtubeApiPromise = null;
    throw error;
  });
  return youtubeApiPromise;
}

export default function YouTubePlayerFrame({ videoId, title, isLive = false, onEnded, onError }) {
  const iframeId = useId().replace(/:/g, "-");
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onEnded, onError });
  callbacksRef.current = { onEnded, onError };

  useEffect(() => {
    let active = true;
    loadYouTubeApi().then((YT) => {
      if (!active || !document.getElementById(iframeId)) return;
      playerRef.current = new YT.Player(iframeId, {
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) callbacksRef.current.onEnded?.();
          },
          onError: (event) => {
            const message = isLive
              ? "The stream may not have started, may have ended, or may not allow embedding. Ask the educator to check the YouTube broadcast."
              : event.data === 101 || event.data === 150
                ? "The creator has disabled embedding for this video. Ask them to allow playback on other websites."
                : event.data === 100
                  ? "This video may be private or was removed by its creator."
                  : "This video cannot be played here. Check the link or ask the creator to review its YouTube playback settings.";
            callbacksRef.current.onError?.(message);
          }
        }
      });
    }).catch(() => {
      // The iframe remains usable if the optional event API is blocked.
    });

    return () => {
      active = false;
      try { playerRef.current?.destroy(); } catch { /* The player can be removed before the API is ready. */ }
      playerRef.current = null;
    };
  }, [videoId, iframeId, isLive]);

  return (
    <iframe
      id={iframeId}
      src={buildYouTubeEmbedUrl(videoId)}
      title={title || "Skillio video"}
      className="h-full w-full border-0"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
