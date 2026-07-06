import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { HomeScreen } from "./components/HomeScreen";
import { LaunchTransition } from "./components/LaunchTransition";
import { useWake } from "./hooks/useWake";
import { type AppDef } from "./apps";

function App() {
  const wakeKey = useWake();
  const [screen, setScreen] = useState("home");
  const [launching, setLaunching] = useState<{ app: AppDef; rect: DOMRect } | null>(null);

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
    } else {
      fetch(launching.app.launchUrl).catch(() => {});
    }
  }

  return (
    <>
      <TopBar key={wakeKey} />
      {screen === "home" && (
        <HomeScreen onRequestLaunch={(app, rect) => setLaunching({ app, rect })} wakeKey={wakeKey} />
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
