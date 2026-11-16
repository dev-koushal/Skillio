/**
 * Mobile Video Landscape Orientation Utility & Hook
 *
 * Automatically locks mobile device screen orientation to landscape
 * when a video or video frame enters fullscreen (enlarged view),
 * and unlocks back to normal when exiting fullscreen.
 */

export async function lockLandscapeOrientation() {
  if (typeof window === "undefined" || !window.screen) return;

  try {
    if (window.screen.orientation && typeof window.screen.orientation.lock === "function") {
      try {
        await window.screen.orientation.lock("landscape");
      } catch (err) {
        // Fallback for browsers that only accept specific orientation values
        await window.screen.orientation.lock("landscape-primary").catch(() => {});
      }
    } else if (typeof window.screen.mozLockOrientation === "function") {
      window.screen.mozLockOrientation("landscape");
    } else if (typeof window.screen.msLockOrientation === "function") {
      window.screen.msLockOrientation("landscape");
    }
  } catch (err) {
    // Gracefully handle unsupported browsers (e.g., iOS Safari or desktop without orientation API)
  }
}

export function unlockScreenOrientation() {
  if (typeof window === "undefined" || !window.screen) return;

  try {
    if (window.screen.orientation && typeof window.screen.orientation.unlock === "function") {
      window.screen.orientation.unlock();
    } else if (typeof window.screen.mozUnlockOrientation === "function") {
      window.screen.mozUnlockOrientation();
    } else if (typeof window.screen.msUnlockOrientation === "function") {
      window.screen.msUnlockOrientation();
    }
  } catch (err) {
    // Graceful fallback
  }
}

export function isFullscreenActive() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function handleFullscreenOrientationChange() {
  if (isFullscreenActive()) {
    lockLandscapeOrientation();
    // Repeating after brief delay ensures orientation locks after fullscreen animation completes
    setTimeout(lockLandscapeOrientation, 150);
  } else {
    unlockScreenOrientation();
  }
}
