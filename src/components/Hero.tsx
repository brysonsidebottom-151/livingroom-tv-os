import { playInJellyfin, type JellyfinMovie } from "../lib/jellyfin";
import { JELLYFIN_SERVER } from "../config";
import placeholderArt from "../assets/sinners.avif";
import "./Hero.css";

interface HeroProps {
  movie: JellyfinMovie | null;
  playFocused: boolean;
  onFocusPlay: () => void;
}

export function Hero({ movie, playFocused, onFocusPlay }: HeroProps) {
  return (
    <div className="hero">
      <img
        className="hero__art"
        src={movie?.artUrl ?? placeholderArt}
        alt=""
        aria-hidden="true"
      />
      <div className="hero__overlay" />
      {movie && (
        <div className="hero__info">
          <span className="hero__eyebrow">Now Featured</span>
          <h1 className="hero__title">{movie.title}</h1>
          <button
            type="button"
            className={`hero__play ${playFocused ? "hero__play--focused" : ""}`}
            onClick={() => playInJellyfin(movie.id, JELLYFIN_SERVER.url)}
            onMouseEnter={() => { document.documentElement.scrollTop = 0; onFocusPlay(); }}
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play in Jellyfin
          </button>
        </div>
      )}
    </div>
  );
}
