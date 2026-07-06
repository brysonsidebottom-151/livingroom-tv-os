import type { ReactNode } from "react";
import {
  JellyfinIcon,
  NavidromeIcon,
  SteamIcon,
  YouTubeIcon,
} from "./components/icons";
import { YOUTUBE_TV_URL } from "./config";

interface AppBase {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
}

export type AppDef =
  | (AppBase & { kind: "external"; url: string })
  | (AppBase & { kind: "launcher"; launchUrl: string });

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
    id: "steam",
    label: "Steam",
    icon: <SteamIcon />,
    color: "#171A21",
    kind: "launcher",
    launchUrl: "/launch/steam",
  },
];
