import { useEffect, useState, type CSSProperties } from "react";
import type { AppDef } from "../apps";
import "./AppBar.css";

// Keep in sync with the padding/transform math in AppBar.css.
export const APP_ICON_WIDTH = 380;
export const APP_ICON_HEIGHT = Math.round((APP_ICON_WIDTH * 9) / 16);
const GAP = 48;
const STEP = APP_ICON_WIDTH + GAP;

// How many copies of the app list to keep mounted for the infinite loop.
// `focusedIndex` is unbounded (HomeScreen just increments/decrements it
// forever); this component re-centers its rendering window onto a fresh
// middle copy whenever focus nears the edge of the buffer, snapping the
// transform with no transition so the identical-looking tiles make the
// reset invisible.
const COPIES = 5;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

interface AppBarProps {
  apps: AppDef[];
  focusedIndex: number;
  active: boolean;
  badgeFor: (app: AppDef) => string | undefined;
  onFocus: (logicalIndex: number) => void;
  onSelect: (app: AppDef, rect: DOMRect) => void;
}

export function AppBar({ apps, focusedIndex, active, badgeFor, onFocus, onSelect }: AppBarProps) {
  const n = apps.length;
  const middleOffset = Math.floor(COPIES / 2) * n;

  const [renderBase, setRenderBase] = useState(focusedIndex);
  const [skipTransition, setSkipTransition] = useState(false);

  const renderedFocusPos = focusedIndex - renderBase + middleOffset;

  useEffect(() => {
    const lower = n;
    const upper = (COPIES - 1) * n - 1;
    if (renderedFocusPos < lower || renderedFocusPos > upper) {
      setSkipTransition(true);
      setRenderBase(focusedIndex);
    }
  }, [renderedFocusPos, focusedIndex, n]);

  useEffect(() => {
    if (skipTransition) {
      const id = requestAnimationFrame(() => setSkipTransition(false));
      return () => cancelAnimationFrame(id);
    }
  }, [skipTransition]);

  const tiles = Array.from({ length: COPIES * n }, (_, slot) => apps[mod(slot, n)]);

  return (
    <div className="app-bar">
      <div
        className="app-bar__track"
        style={{
          transform: `translateX(${-renderedFocusPos * STEP}px)`,
          transition: skipTransition ? "none" : undefined,
        }}
      >
        {tiles.map((app, slot) => {
          const focused = active && slot === renderedFocusPos;
          const rel = slot - renderedFocusPos;
          // Tier is measured from the mount-time center (middleOffset), not
          // the live focus position, so scrolling later never re-triggers
          // the entrance fade-in on tiles that already played it.
          const tier = Math.min(Math.abs(slot - middleOffset), 2);
          const badge = badgeFor(app);
          return (
            <button
              key={slot}
              type="button"
              className={[
                "app-icon",
                `app-icon--tier-${tier}`,
                focused && "app-icon--focused",
                active && rel < 0 && "app-icon--push-left",
                active && rel > 0 && "app-icon--push-right",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  "--tile-rest-opacity": focused ? 1 : 0.8,
                  "--tile-rest-grayscale": focused ? 0 : 0.25,
                } as CSSProperties
              }
              onClick={(e) => onSelect(app, e.currentTarget.getBoundingClientRect())}
              onMouseEnter={() => onFocus(focusedIndex + (slot - renderedFocusPos))}
              tabIndex={-1}
            >
              <span className="app-icon__clip">
                <span className="app-icon__art">{app.icon}</span>
              </span>
              {badge && <span className="app-icon__badge">{badge}</span>}
              {focused && <span className="app-icon__label">{app.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
