import { useEffect, useRef, useState } from "react";
import type { AppDef } from "../apps";
import "./LaunchTransition.css";

const BACKDROP_MS = 360;
const GROW_MS = 480;
const HOLD_MS = 320;
const ICON_FADE_MS = 260;
const COLOR_HOLD_MS = 320;
const REVEAL_MS = 800;

const GROWN_WIDTH = 600;
const GROWN_HEIGHT = Math.round((GROWN_WIDTH * 9) / 16);

type Phase = "start" | "backdropIn" | "grown" | "iconHidden" | "revealed";

interface LaunchTransitionProps {
  app: AppDef;
  rect: DOMRect;
  // Called once the screen is fully covered by the app's color — safe to
  // do the real navigation / screen swap behind it.
  onMidpoint: () => void;
  // Called once the transition has nothing left to show (after the reveal
  // fade for internal apps; external apps navigate away before this fires).
  onDone: () => void;
}

export function LaunchTransition({ app, rect, onMidpoint, onDone }: LaunchTransitionProps) {
  const [phase, setPhase] = useState<Phase>("start");
  const firedMidpoint = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("backdropIn"));
    const t0 = setTimeout(() => setPhase("grown"), BACKDROP_MS);
    const t1 = setTimeout(() => setPhase("iconHidden"), BACKDROP_MS + GROW_MS + HOLD_MS);
    const resolvesInPlace = app.kind === "launcher";

    const t2 = setTimeout(() => {
      firedMidpoint.current = true;
      onMidpoint();
    }, BACKDROP_MS + GROW_MS + HOLD_MS + ICON_FADE_MS);
    const t2b = resolvesInPlace
      ? setTimeout(
          () => setPhase("revealed"),
          BACKDROP_MS + GROW_MS + HOLD_MS + ICON_FADE_MS + COLOR_HOLD_MS,
        )
      : undefined;
    const t3 = resolvesInPlace
      ? setTimeout(
          onDone,
          BACKDROP_MS + GROW_MS + HOLD_MS + ICON_FADE_MS + COLOR_HOLD_MS + REVEAL_MS,
        )
      : undefined;

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      if (t2b) clearTimeout(t2b);
      if (t3) clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grown = phase === "grown" || phase === "iconHidden" || phase === "revealed";
  const iconVisible = phase === "start" || phase === "backdropIn" || phase === "grown";
  const backdropVisible = phase !== "start" && phase !== "revealed";

  const ghostStyle = grown
    ? {
        top: `calc(50vh - ${GROWN_HEIGHT / 2}px)`,
        left: `calc(50vw - ${GROWN_WIDTH / 2}px)`,
        width: `${GROWN_WIDTH}px`,
        height: `${GROWN_HEIGHT}px`,
      }
    : {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      };

  return (
    <div className="launch-transition">
      <div
        className="launch-transition__backdrop"
        style={{ background: app.color, opacity: backdropVisible ? 1 : 0 }}
      />
      <div
        className={`launch-transition__ghost ${grown ? "launch-transition__ghost--grown" : ""}`}
        style={{ ...ghostStyle, opacity: iconVisible ? 1 : 0 }}
      >
        {app.icon}
      </div>
    </div>
  );
}
