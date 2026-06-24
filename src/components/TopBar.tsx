import { useClock } from "../hooks/useClock";
import { useServerStatus } from "../hooks/useServerStatus";
import {
  HOME_ASSISTANT_SERVER,
  JELLYFIN_SERVER,
  NAVIDROME_SERVER,
  type ServerConfig,
} from "../config";
import "./TopBar.css";

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot status-dot--${status}`} />;
}

function ServerIndicator({
  label,
  server,
}: {
  label: string;
  server: ServerConfig;
}) {
  const { status, latencyMs } = useServerStatus(server);

  let detail = "Not set up";
  if (status === "checking") detail = "Checking…";
  if (status === "online") detail = `${latencyMs}ms`;
  if (status === "offline") detail = "Offline";

  return (
    <div className="server-indicator" title={`${label}: ${detail}`}>
      <StatusDot status={status} />
      <span className="server-indicator__label">{label}</span>
      <span className="server-indicator__detail">{detail}</span>
    </div>
  );
}

export function TopBar() {
  const { time, date } = useClock();

  return (
    <header className="top-bar">
      <div className="top-bar__servers">
        <ServerIndicator label="Jellyfin" server={JELLYFIN_SERVER} />
        <ServerIndicator label="Navidrome" server={NAVIDROME_SERVER} />
        <ServerIndicator label="Home Assistant" server={HOME_ASSISTANT_SERVER} />
      </div>
      <div className="top-bar__clock">
        <span className="top-bar__date">{date}</span>
        <span className="top-bar__time">{time}</span>
      </div>
    </header>
  );
}
