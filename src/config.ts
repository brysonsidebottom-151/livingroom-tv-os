// Central place to point the OS at your home servers.
// Leave a URL blank until that server actually exists — the app will show
// "Not set up" instead of treating it as an error.
export interface ServerConfig {
  name: string;
  url: string;
  healthPath: string;
}

export const JELLYFIN_SERVER: ServerConfig & { apiKey: string; userId: string } = {
  name: "Jellyfin",
  url: import.meta.env.VITE_JELLYFIN_SERVER_URL ?? "",
  apiKey: import.meta.env.VITE_JELLYFIN_API_KEY ?? "",
  userId: import.meta.env.VITE_JELLYFIN_USER_ID ?? "",
  // /System/Info/Public needs no auth and is the cheapest reachability check.
  healthPath: "/System/Info/Public",
};

export const NAVIDROME_SERVER: ServerConfig = {
  name: "Navidrome",
  url: import.meta.env.VITE_NAVIDROME_SERVER_URL ?? "",
  healthPath: "/",
};

export const HOME_ASSISTANT_SERVER: ServerConfig = {
  name: "Home Assistant",
  url: import.meta.env.VITE_HOME_ASSISTANT_SERVER_URL ?? "",
  healthPath: "/",
};

// Where the YouTube tile sends the browser. youtube.com/tv is YouTube's
// own TV-optimized layout (big tiles, remote-friendly nav).
export const YOUTUBE_TV_URL = "https://www.youtube.com/tv";

export const STATUS_POLL_INTERVAL_MS = 15_000;
export const STATUS_TIMEOUT_MS = 3_000;

// How often to re-check for a newly added movie. It only arrives roughly
// weekly, so there's no need to poll aggressively.
export const RECENT_MOVIE_POLL_INTERVAL_MS = 30 * 60_000;
