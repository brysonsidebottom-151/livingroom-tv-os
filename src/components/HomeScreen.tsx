import { useEffect, useState } from "react";
import { Hero } from "./Hero";
import { AppBar } from "./AppBar";
import { APPS, type AppDef } from "../apps";
import { HOME_ASSISTANT_SERVER, JELLYFIN_SERVER, NAVIDROME_SERVER } from "../config";
import { useServerStatus } from "../hooks/useServerStatus";
import { useJellyfinRecentMovie } from "../hooks/useJellyfinRecentMovie";
import { playInJellyfin } from "../lib/jellyfin";
import "./HomeScreen.css";

type Zone = "hero" | "bar";

interface HomeScreenProps {
  onRequestLaunch: (app: AppDef, rect: DOMRect) => void;
  wakeKey: number;
}

export function HomeScreen({ onRequestLaunch, wakeKey }: HomeScreenProps) {
  const movie = useJellyfinRecentMovie();
  const jellyfinStatus = useServerStatus(JELLYFIN_SERVER);
  const navidromeStatus = useServerStatus(NAVIDROME_SERVER);
  const homeAssistantStatus = useServerStatus(HOME_ASSISTANT_SERVER);

  const [zone, setZone] = useState<Zone>("bar");
  const [index, setIndex] = useState(0);

  function badgeFor(app: AppDef) {
    if (app.kind !== "server") return undefined;
    const status =
      app.server === JELLYFIN_SERVER
        ? jellyfinStatus
        : app.server === NAVIDROME_SERVER
          ? navidromeStatus
          : homeAssistantStatus;
    return status.status === "unconfigured" ? "Setup needed" : undefined;
  }

  function requestLaunch(app: AppDef, rect?: DOMRect) {
    const r = rect ?? document.querySelector(".app-icon--focused")?.getBoundingClientRect();
    if (r) onRequestLaunch(app, r);
  }

  function realApp() {
    const n = APPS.length;
    return APPS[((index % n) + n) % n];
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && zone === "bar") {
        setIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft" && zone === "bar") {
        setIndex((i) => i - 1);
      } else if (e.key === "ArrowUp" && zone === "bar" && movie) {
        setZone("hero");
      } else if (e.key === "ArrowDown" && zone === "hero") {
        setZone("bar");
      } else if (e.key === "Enter" || e.key === " ") {
        if (zone === "hero" && movie) {
          playInJellyfin(movie.id, JELLYFIN_SERVER.url);
        } else {
          requestLaunch(realApp());
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zone, index, movie]);

  return (
    <div className="home-screen">
      <Hero
        key={`hero-${wakeKey}`}
        movie={movie}
        playFocused={zone === "hero"}
        onFocusPlay={() => setZone("hero")}
      />
      <AppBar
        key={`appbar-${wakeKey}`}
        apps={APPS}
        focusedIndex={index}
        active={zone === "bar"}
        badgeFor={badgeFor}
        onFocus={(i) => {
          setZone("bar");
          setIndex(i);
        }}
        onSelect={requestLaunch}
      />
    </div>
  );
}
