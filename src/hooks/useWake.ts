import { useEffect, useState } from "react";

// Bumping this key forces the background/top-bar/app-bar to remount, which
// replays their CSS entrance animations (see Hero.css, TopBar.css,
// AppBar.css) — once on load for free, and again whenever the screen comes
// back from being hidden (TV woke from sleep, browser tab regained
// visibility, etc), without resetting any of HomeScreen's own state
// (focused app, scroll position, etc).
//
// Also listens for window focus, not just visibilitychange: switching back
// from Kodi's virtual desktop (the Jellyfin "go home" action) re-focuses
// this window without ever hiding it, so document.hidden never toggles --
// only the OS-level focus event fires in that case.
export function useWake() {
  const [wakeKey, setWakeKey] = useState(0);

  useEffect(() => {
    function replay() {
      setWakeKey((k) => k + 1);
    }
    function handleVisibility() {
      if (!document.hidden) {
        replay();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", replay);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", replay);
    };
  }, []);

  return wakeKey;
}
