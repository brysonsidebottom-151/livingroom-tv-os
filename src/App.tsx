import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { HomeScreen } from "./components/HomeScreen";
import { AppScreen } from "./components/AppScreen";
import { SearchScreen } from "./components/SearchScreen";
import { LaunchTransition } from "./components/LaunchTransition";
import { useWake } from "./hooks/useWake";
import { APPS, type AppDef } from "./apps";

function App() {
  const wakeKey = useWake();
  const [screen, setScreen] = useState("home");
  const [launching, setLaunching] = useState<{ app: AppDef; rect: DOMRect } | null>(null);

  const activeApp = screen === "home" ? null : APPS.find((a) => a.id === screen);

  // When the page is shown again — notably returning from an external app like
  // StreamHome via the remote's Back (Firefox restores this page from its
  // back/forward cache, frozen mid-launch) — clear any in-flight launch overlay
  // and snap back to a clean home screen. Without this, the LaunchTransition
  // backdrop (which external apps never dismiss) stays covering everything.
  useEffect(() => {
    function onShow() {
      setLaunching(null);
      setScreen("home");
    }
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function handleMidpoint() {
    if (!launching) return;
    if (launching.app.kind === "external") {
      window.location.href = launching.app.url;
    } else if (launching.app.kind === "launcher") {
      fetch(launching.app.launchUrl).catch(() => {});
    } else {
      setScreen(launching.app.id);
    }
  }

  return (
    <>
      <TopBar key={wakeKey} />
      {screen === "home" && (
        <HomeScreen onRequestLaunch={(app, rect) => setLaunching({ app, rect })} wakeKey={wakeKey} />
      )}
      {activeApp && activeApp.kind === "server" && (
        <AppScreen
          title={activeApp.label}
          server={activeApp.server}
          envVar={activeApp.envVar}
          onBack={() => setScreen("home")}
        />
      )}
      {activeApp && activeApp.kind === "search" && (
        <SearchScreen onBack={() => setScreen("home")} />
      )}
      {launching && (
        <LaunchTransition
          app={launching.app}
          rect={launching.rect}
          onMidpoint={handleMidpoint}
          onDone={() => setLaunching(null)}
        />
      )}
    </>
  );
}

export default App;
