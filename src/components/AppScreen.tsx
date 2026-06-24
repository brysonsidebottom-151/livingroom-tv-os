import { useEffect } from "react";
import type { ServerConfig } from "../config";
import { useServerStatus } from "../hooks/useServerStatus";
import "./AppScreen.css";

interface AppScreenProps {
  title: string;
  server: ServerConfig;
  envVar: string;
  onBack: () => void;
}

export function AppScreen({ title, server, envVar, onBack }: AppScreenProps) {
  const { status } = useServerStatus(server);

  // Once the server is confirmed reachable, hand the whole browser over to
  // it. We navigate the top-level page (rather than an iframe) because
  // Home Assistant sends X-Frame-Options: SAMEORIGIN and refuses to be
  // embedded. Going home from there is handled out-of-band: a long-press
  // of the remote's Menu button hits the launcher's /home, which notices
  // Firefox is no longer on the kiosk page and reloads it back to the OS.
  useEffect(() => {
    if (status === "online" && server.url) {
      window.location.href = server.url;
    }
  }, [status, server.url]);

  return (
    <div className="app-screen">
      {status === "unconfigured" && (
        <div className="app-screen__message">
          <h2>{title} isn't set up yet</h2>
          <p>
            Once the server is running, set its address in{" "}
            <code>.env</code> as <code>{envVar}</code>{" "}
            and this screen will connect automatically.
          </p>
        </div>
      )}
      {status === "offline" && (
        <div className="app-screen__message">
          <h2>Can't reach {title}</h2>
          <p>The server is configured but not responding. Check that it's running.</p>
        </div>
      )}
      {(status === "checking" || status === "online") && (
        <div className="app-screen__message">
          <h2>Opening {title}…</h2>
        </div>
      )}
      <button className="app-screen__back" onClick={onBack} autoFocus>
        ← Back
      </button>
    </div>
  );
}
