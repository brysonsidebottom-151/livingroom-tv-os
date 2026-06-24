import type { ReactNode } from "react";
import {
  HomeAssistantIcon,
  JellyfinIcon,
  NavidromeIcon,
  SearchIcon,
  StremioIcon,
  SteamIcon,
  XboxIcon,
  YouTubeIcon,
} from "./components/icons";
import { HOME_ASSISTANT_SERVER, YOUTUBE_TV_URL, type ServerConfig } from "./config";

interface AppBase {
  id: string;
  label: string;
  icon: ReactNode;
  // Matches the tile's own background color (see src/assets/icons) so the
  // launch transition can expand to fill the screen with no visible seam.
  color: string;
}

export type AppDef =
  | (AppBase & { kind: "external"; url: string })
  | (AppBase & { kind: "server"; server: ServerConfig; envVar: string })
  | (AppBase & { kind: "launcher"; launchUrl: string })
  | (AppBase & { kind: "search" });

// The bottom app bar, in display order. Add new apps here — everything
// else (the scrolling bar, routing, status badges, launch transition) all
// follows from it.
export const APPS: AppDef[] = [
  {
    id: "youtube",
    label: "YouTube",
    icon: <YouTubeIcon />,
    color: "#CF2226",
    kind: "external",
    url: YOUTUBE_TV_URL,
  },
  {
    id: "movies",
    label: "Jellyfin",
    icon: <JellyfinIcon />,
    color: "#000B25",
    // Opens the custom Jellyfin browse UI (served at /browse.html) instead of
    // launching Kodi. Same-window nav; the remote's Back returns home.
    kind: "external",
    url: "/browse.html",
  },
  {
    id: "music",
    label: "Navidrome",
    icon: <NavidromeIcon />,
    color: "#F40057",
    kind: "launcher",
    launchUrl: "/launch/navidrome",
  },
  {
    id: "stremio",
    label: "Stremio",
    icon: <StremioIcon />,
    color: "#272458",
    kind: "external",
    url: "https://web.stremio.com/",
  },
  {
    id: "homeassistant",
    label: "Home Assistant",
    icon: <HomeAssistantIcon />,
    color: "#0B1C2C",
    kind: "server",
    server: HOME_ASSISTANT_SERVER,
    envVar: "VITE_HOME_ASSISTANT_SERVER_URL",
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon />,
    color: "#0b1422",
    kind: "search",
  },
  {
    id: "steam",
    label: "Steam",
    icon: <SteamIcon />,
    color: "#171A21",
    kind: "launcher",
    launchUrl: "/launch/steam",
  },
  {
    id: "xbox",
    label: "Xbox",
    icon: <XboxIcon />,
    color: "#107C10",
    kind: "launcher",
    launchUrl: "/launch/xbox",
  },
];
