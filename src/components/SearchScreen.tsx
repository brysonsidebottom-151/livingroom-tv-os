import { useCallback, useEffect, useRef, useState } from "react";
import { JELLYFIN_SERVER } from "../config";
import {
  searchJellyfin,
  resolvePlayableId,
  playInJellyfin,
  type JellyfinSearchResult,
} from "../lib/jellyfin";
import "./SearchScreen.css";

// On-screen keyboard laid out as a 6-wide grid, navigated with the d-pad.
// The three action keys live on the final (partial) row.
const KEYS = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R",
  "S", "T", "U", "V", "W", "X",
  "Y", "Z", "0", "1", "2", "3",
  "4", "5", "6", "7", "8", "9",
  "SPACE", "DEL", "CLEAR",
];
const COLS = 6;
const RESULT_COLS = 4;
const SEARCH_DEBOUNCE_MS = 300;

type Zone = "keys" | "results";

interface SearchScreenProps {
  onBack: () => void;
}

export function SearchScreen({ onBack }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JellyfinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [zone, setZone] = useState<Zone>("keys");
  const [keyIndex, setKeyIndex] = useState(0);
  const [resultIndex, setResultIndex] = useState(0);

  const configured = Boolean(
    JELLYFIN_SERVER.url && JELLYFIN_SERVER.apiKey && JELLYFIN_SERVER.userId,
  );

  // Push a history entry on mount so the remote's Back button (which the
  // IR remap sends to the browser as Alt+Left) pops straight back to home.
  // Escape routes through the same path for keyboard parity.
  useEffect(() => {
    window.history.pushState({ screen: "search" }, "");
    const onPop = () => onBack();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onBack]);

  // Debounced live search. Aborts the in-flight request whenever the query
  // changes again so results never arrive out of order.
  useEffect(() => {
    const q = query.trim();
    if (!configured || q.length < 1) {
      setResults([]);
      setLoading(false);
      setZone("keys");
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await searchJellyfin(
          JELLYFIN_SERVER.url,
          JELLYFIN_SERVER.apiKey,
          JELLYFIN_SERVER.userId,
          q,
          ctrl.signal,
        );
        setResults(r);
        setResultIndex(0);
        if (r.length === 0) setZone("keys");
      } catch {
        /* aborted or request failed — leave previous results in place */
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, configured]);

  const applyKey = useCallback((k: string) => {
    if (k === "SPACE") setQuery((q) => q + " ");
    else if (k === "DEL") setQuery((q) => q.slice(0, -1));
    else if (k === "CLEAR") setQuery("");
    else setQuery((q) => q + k);
  }, []);

  const resultsPaneRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll the focused result to the top of the pane on keyboard nav.
  useEffect(() => {
    if (zone !== "results") return;
    resultRefs.current[resultIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Defensive reset: Firefox kiosk sometimes scrolls the root element despite
    // overflow:hidden on body, which shifts the whole UI off-screen.
    document.documentElement.scrollTop = 0;
  }, [zone, resultIndex]);

  // Scroll results pane back to top whenever a new result set arrives.
  useEffect(() => {
    if (resultsPaneRef.current) resultsPaneRef.current.scrollTop = 0;
  }, [results]);

  const playResult = useCallback(async (r: JellyfinSearchResult) => {
    const id = await resolvePlayableId(
      JELLYFIN_SERVER.url,
      JELLYFIN_SERVER.apiKey,
      JELLYFIN_SERVER.userId,
      r,
      new AbortController().signal,
    );
    if (id) playInJellyfin(id, JELLYFIN_SERVER.url);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        window.history.back();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (zone === "keys") applyKey(KEYS[keyIndex]);
        else if (results[resultIndex]) playResult(results[resultIndex]);
        return;
      }
      if (zone === "keys") {
        const col = keyIndex % COLS;
        if (e.key === "ArrowUp" && keyIndex - COLS >= 0) setKeyIndex(keyIndex - COLS);
        else if (e.key === "ArrowDown" && keyIndex + COLS < KEYS.length) setKeyIndex(keyIndex + COLS);
        else if (e.key === "ArrowLeft" && col > 0) setKeyIndex(keyIndex - 1);
        else if (e.key === "ArrowRight") {
          if (col < COLS - 1 && keyIndex + 1 < KEYS.length) setKeyIndex(keyIndex + 1);
          else if (results.length) {
            setZone("results");
            setResultIndex(0);
          }
        }
      } else {
        const col = resultIndex % RESULT_COLS;
        if (e.key === "ArrowUp" && resultIndex - RESULT_COLS >= 0) setResultIndex(resultIndex - RESULT_COLS);
        else if (e.key === "ArrowDown" && resultIndex + RESULT_COLS < results.length) setResultIndex(resultIndex + RESULT_COLS);
        else if (e.key === "ArrowRight" && col < RESULT_COLS - 1 && resultIndex + 1 < results.length) setResultIndex(resultIndex + 1);
        else if (e.key === "ArrowLeft") {
          if (col > 0) setResultIndex(resultIndex - 1);
          else setZone("keys");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone, keyIndex, resultIndex, results, applyKey, playResult]);

  function resultsBody() {
    if (!configured) {
      return <p className="search-screen__hint">Jellyfin isn’t configured yet.</p>;
    }
    if (query.trim().length === 0) {
      return <p className="search-screen__hint">Type to search your movies &amp; shows.</p>;
    }
    if (loading && results.length === 0) {
      return <p className="search-screen__hint">Searching…</p>;
    }
    if (results.length === 0) {
      return <p className="search-screen__hint">No matches in your library.</p>;
    }
    return (
      <div className="search-results">
        {results.map((r, i) => {
          const focused = zone === "results" && i === resultIndex;
          return (
            <button
              key={r.id}
              ref={(el) => { resultRefs.current[i] = el; }}
              type="button"
              tabIndex={-1}
              className={`search-result ${focused ? "search-result--focused" : ""}`}
              onMouseEnter={() => {
                document.documentElement.scrollTop = 0;
                setZone("results");
                setResultIndex(i);
              }}
              onClick={() => playResult(r)}
            >
              <span className="search-result__poster">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="search-result__poster-fallback">{r.name}</span>
                )}
                <span className="search-result__type">
                  {r.type === "Series" ? "TV" : "Movie"}
                </span>
              </span>
              <span className="search-result__title">{r.name}</span>
              {r.year && <span className="search-result__year">{r.year}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="search-screen">
      <div className="search-screen__bar">
        <svg className="search-screen__glass" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <line x1="15.5" y1="15.5" x2="21" y2="21" />
        </svg>
        <span className="search-screen__query">
          {query || <span className="search-screen__placeholder">Search…</span>}
          <span className="search-screen__caret" />
        </span>
      </div>

      <div className="search-screen__body">
        <div className={`search-kb ${zone === "keys" ? "search-kb--active" : ""}`}>
          {KEYS.map((k, i) => {
            const focused = zone === "keys" && i === keyIndex;
            const wide = k === "SPACE" || k === "DEL" || k === "CLEAR";
            const label = k === "SPACE" ? "␣" : k === "DEL" ? "⌫" : k === "CLEAR" ? "✕" : k;
            return (
              <button
                key={k}
                type="button"
                tabIndex={-1}
                className={[
                  "search-key",
                  wide && "search-key--wide",
                  focused && "search-key--focused",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => {
                  setZone("keys");
                  setKeyIndex(i);
                }}
                onClick={() => applyKey(k)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="search-screen__results-pane" ref={resultsPaneRef}>{resultsBody()}</div>
      </div>
    </div>
  );
}
