// Real brand logos, pre-composited to 16:9 tiles (see process-icons script
// history / README) so they fill the app tiles edge to edge without
// distortion.
import youtube from "../assets/icons/youtube.png";
import jellyfin from "../assets/icons/jellyfin.png";
import navidrome from "../assets/icons/navidrome.png";
import stremio from "../assets/icons/stremio.png";
import homeAssistant from "../assets/icons/home-assistant.png";
import steam from "../assets/icons/steam.png";
import xbox from "../assets/icons/xbox.png";

export function YouTubeIcon() {
  return <img src={youtube} alt="" />;
}

export function JellyfinIcon() {
  return <img src={jellyfin} alt="" />;
}

export function NavidromeIcon() {
  return <img src={navidrome} alt="" />;
}

export function StremioIcon() {
  return <img src={stremio} alt="" />;
}

export function HomeAssistantIcon() {
  return <img src={homeAssistant} alt="" />;
}

// Inline SVG (no brand image): a 16:9 tile with a magnifier, themed to the
// app's blue accent so the launch transition expands seamlessly from it.
export function SearchIcon() {
  return (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="searchTileBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16273f" />
          <stop offset="1" stopColor="#0b1422" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#searchTileBg)" />
      <g fill="none" stroke="#5ea2ff" strokeWidth="11" strokeLinecap="round">
        <circle cx="146" cy="82" r="33" />
        <line x1="171" y1="107" x2="196" y2="132" />
      </g>
    </svg>
  );
}

export function SteamIcon() {
  return <img src={steam} alt="" />;
}

export function XboxIcon() {
  return <img src={xbox} alt="" />;
}
