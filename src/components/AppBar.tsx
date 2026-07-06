import type { CSSProperties } from "react";
import type { AppDef } from "../apps";
import "./AppBar.css";

export const APP_ICON_WIDTH = 380;
export const APP_ICON_HEIGHT = Math.round((APP_ICON_WIDTH * 9) / 16);
const GAP = 48;
const STEP = APP_ICON_WIDTH + GAP;

interface AppBarProps {
  apps: AppDef[];
  focusedIndex: number;
  active: boolean;
  onFocus: (index: number) => void;
  onSelect: (app: AppDef, rect: DOMRect) => void;
}

export function AppBar({ apps, focusedIndex, active, onFocus, onSelect }: AppBarProps) {
  const n = apps.length;
  const clamped = Math.max(0, Math.min(n - 1, focusedIndex));

  return (
    <div className="app-bar">
      <div
        className="app-bar__track"
        style={{ transform: `translateX(${-clamped * STEP}px)` }}
      >
        {apps.map((app, i) => {
          const focused = active && i === clamped;
          const rel = i - clamped;
          const tier = Math.min(Math.abs(i - Math.floor(n / 2)), 2);
          return (
            <button
              key={app.id}
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
              onMouseEnter={() => onFocus(i)}
              tabIndex={-1}
            >
              <span className="app-icon__clip">
                <span className="app-icon__art">{app.icon}</span>
              </span>
              {focused && <span className="app-icon__label">{app.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
