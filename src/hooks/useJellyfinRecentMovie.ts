import { useEffect, useState } from "react";
import { JELLYFIN_SERVER, RECENT_MOVIE_POLL_INTERVAL_MS } from "../config";
import { fetchMostRecentMovie, type JellyfinMovie } from "../lib/jellyfin";

export function useJellyfinRecentMovie() {
  const [movie, setMovie] = useState<JellyfinMovie | null>(null);

  useEffect(() => {
    if (!JELLYFIN_SERVER.url || !JELLYFIN_SERVER.apiKey || !JELLYFIN_SERVER.userId) return;

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchMostRecentMovie(
          JELLYFIN_SERVER.url,
          JELLYFIN_SERVER.apiKey,
          JELLYFIN_SERVER.userId,
          controller.signal,
        );
        if (!cancelled) setMovie(result);
      } catch {
        if (!cancelled) setMovie(null);
      }
    }

    load();
    const id = setInterval(load, RECENT_MOVIE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return movie;
}
