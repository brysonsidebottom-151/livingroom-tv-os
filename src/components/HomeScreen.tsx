import { useEffect, useState } from "react";
import { Hero } from "./Hero";
import { AppBar } from "./AppBar";
import { APPS, type AppDef } from "../apps";
import { JELLYFIN_SERVER } from "../config";
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

  const [zone, setZone] = useState<Zone>("bar");
  const [index, setIndex] = useState(0);

  function requestLaunch(app: AppDef, rect?: DOMRect) {
    const r = rect ?? document.querySelector(".app-icon--focused")?.getBoundingClientRect();
    if (r) onRequestLaunch(app, r);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && zone === "bar") {
        setIndex((i) => Math.min(APPS.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" && zone === "bar") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowUp" && zone === "bar" && movie) {
        setZone("hero");
      } else if (e.key === "ArrowDown" && zone === "hero") {
        setZone("bar");
      } else if (e.key === "Enter" || e.key === " ") {
        if (zone === "hero" && movie) {
          playInJellyfin(movie.id, JELLYFIN_SERVER.url);
        } else {
          requestLaunch(APPS[index]);
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
        onFocus={(i) => {
          setZone("bar");
          setIndex(i);
        }}
        onSelect={requestLaunch}
      />
    </div>
  );
}
