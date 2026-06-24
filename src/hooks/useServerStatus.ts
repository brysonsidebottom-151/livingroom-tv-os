import { useEffect, useRef, useState } from "react";
import {
  STATUS_POLL_INTERVAL_MS,
  STATUS_TIMEOUT_MS,
  type ServerConfig,
} from "../config";

export type ServerStatus = "unconfigured" | "checking" | "online" | "offline";

export interface ServerStatusResult {
  status: ServerStatus;
  latencyMs: number | null;
}

export function useServerStatus(server: ServerConfig): ServerStatusResult {
  const [result, setResult] = useState<ServerStatusResult>({
    status: server.url ? "checking" : "unconfigured",
    latencyMs: null,
  });
  const urlRef = useRef(server.url);
  urlRef.current = server.url;

  useEffect(() => {
    if (!server.url) {
      setResult({ status: "unconfigured", latencyMs: null });
      return;
    }

    let cancelled = false;

    async function check() {
      const target = urlRef.current + server.healthPath;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
      const start = performance.now();
      try {
        await fetch(target, { signal: controller.signal, mode: "no-cors" });
        const latencyMs = Math.round(performance.now() - start);
        if (!cancelled) setResult({ status: "online", latencyMs });
      } catch {
        if (!cancelled) setResult({ status: "offline", latencyMs: null });
      } finally {
        clearTimeout(timeout);
      }
    }

    check();
    const id = setInterval(check, STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [server.url, server.healthPath]);

  return result;
}
