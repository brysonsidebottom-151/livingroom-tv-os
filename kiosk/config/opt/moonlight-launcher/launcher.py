#!/usr/bin/env python3
"""Local launcher service for the living-room kiosk.

Handles requests from the web UI:
  - /launch/steam, /launch/xbox: start a Moonlight stream (see config.json)
  - /launch/<kodi-app>: switch to the hidden Kodi desktop and jump straight
    into the relevant Kodi screen (see KODI_PLUGINS), then start watching
    for the user navigating back to Kodi Home (pressing Menu/Back
    repeatedly) -- once detected, automatically switches back to the kiosk
    desktop. No Kodi-side scripting needed, just server-side polling of
    Kodi own JSON-RPC state.
  - /launch/jellyfin-play?id=ITEM_ID: switch to Kodi, open the Favourites
    screen, then immediately start playing that specific Jellyfin item.
    Since playback is started directly from Favourites (no intermediate
    library browse), Kodi back-stack stays exactly two screens deep:
    Favourites then the playing movie. A single Back press during playback
    stops it and returns to Favourites, not further back.
  - /home: forcibly stop any Kodi playback, reset Kodi to its Home window,
    and switch back to the kiosk desktop. This is the go-home action --
    triggered either by the auto-watcher above, or directly (e.g. a
    long-press on a remote Menu button).
"""
import json
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"
DEFAULT_CONFIG = {
    "host": "",
    "apps": {
        "steam": "Desktop",
        "xbox": "Desktop",
    },
}

KODI_PLUGINS = {
    "jellyfin": ("favouritesbrowser", None),
    "navidrome": ("music", "plugin://plugin.audio.subsonic/"),
}

KODI_RPC_URL = "http://localhost:8080/jsonrpc"
KODI_DESKTOP = "1"
KIOSK_DESKTOP = "0"
KODI_HOME_WINDOW_ID = 10000
POLL_INTERVAL = 1.0
POLL_TIMEOUT = 60 * 30

watch_lock = threading.Lock()
watch_generation = 0


def load_config():
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text())
    CONFIG_PATH.write_text(json.dumps(DEFAULT_CONFIG, indent=2))
    return DEFAULT_CONFIG


def kodi_rpc(method, params=None):
    body = json.dumps({"jsonrpc": "2.0", "method": method, "params": params or {}, "id": 1}).encode()
    req = urllib.request.Request(KODI_RPC_URL, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}


def switch_desktop(index):
    subprocess.run(["wmctrl", "-s", index], check=False)


def firefox_on_kiosk_page():
    # YouTube/Stremio/Max are "external" apps: the React app navigates
    # Firefox's whole page away to their real site (no iframe -- those
    # sites block framing anyway). Once there, our own page's JS isn't
    # running anymore, so nothing in-app can catch a "go home" signal.
    # The window title is the only outside signal available: our own app
    # always titles itself "livingroom-tv-os", any other site won't.
    result = subprocess.run(["wmctrl", "-l"], capture_output=True, text=True)
    for line in result.stdout.splitlines():
        if "Mozilla Firefox" in line:
            return "livingroom-tv-os" in line
    return True


def reload_kiosk_firefox():
    # Killing it is enough -- the kiosk's xinitrc loop relaunches Firefox
    # pointed straight back at http://localhost/ a couple seconds later.
    subprocess.run(["pkill", "-9", "-u", "kiosk", "firefox"], check=False)


def reset_kodi_to_home():
    players = kodi_rpc("Player.GetActivePlayers").get("result", [])
    for player in players:
        kodi_rpc("Player.Stop", {"playerid": player["playerid"]})
    kodi_rpc("GUI.ActivateWindow", {"window": "home"})


def watch_for_kodi_home(my_generation):
    start = time.time()
    while time.time() - start < POLL_TIMEOUT:
        time.sleep(POLL_INTERVAL)
        with watch_lock:
            if my_generation != watch_generation:
                return
        result = kodi_rpc("GUI.GetProperties", {"properties": ["currentwindow"]})
        window = result.get("result", {}).get("currentwindow", {})
        if window.get("id") == KODI_HOME_WINDOW_ID:
            switch_desktop(KIOSK_DESKTOP)
            subprocess.run(["wmctrl", "-a", "Firefox"], check=False)
            return


def start_watch():
    global watch_generation
    with watch_lock:
        watch_generation += 1
        my_generation = watch_generation
    threading.Thread(target=watch_for_kodi_home, args=(my_generation,), daemon=True).start()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        global watch_generation
        split = urllib.parse.urlsplit(self.path)
        parts = split.path.strip("/").split("/")
        query = urllib.parse.parse_qs(split.query)
        config = load_config()
        host = config.get("host", "")

        if parts == ["launch", "jellyfin-play"]:
            item_id = query.get("id", [None])[0]
            if not item_id:
                self._json(400, {"error": "missing id query parameter"})
                return
            switch_desktop(KODI_DESKTOP)
            subprocess.run(["wmctrl", "-a", "Kodi"], check=False)
            kodi_rpc("GUI.ActivateWindow", {"window": "favouritesbrowser"})
            play_path = f"plugin://plugin.video.jellycon/?item_id={item_id}&mode=PLAY"
            result = kodi_rpc("Player.Open", {"item": {"file": play_path}})
            start_watch()
            self._json(200, {"status": "playing", "kodi": result})
            return

        if parts[:1] == ["launch"] and len(parts) == 2 and parts[1] in KODI_PLUGINS:
            window_type, plugin_path = KODI_PLUGINS[parts[1]]
            switch_desktop(KODI_DESKTOP)
            subprocess.run(["wmctrl", "-a", "Kodi"], check=False)
            params = {"window": window_type}
            if plugin_path:
                params["parameters"] = [plugin_path]
            result = kodi_rpc("GUI.ActivateWindow", params)
            start_watch()
            self._json(200, {"status": "launched", "kodi": result})
            return

        if parts == ["home"]:
            with watch_lock:
                watch_generation += 1
            reset_kodi_to_home()
            switch_desktop(KIOSK_DESKTOP)
            if firefox_on_kiosk_page():
                subprocess.run(["wmctrl", "-a", "Firefox"], check=False)
            else:
                reload_kiosk_firefox()
            self._json(200, {"status": "home"})
            return

        if parts[:1] == ["launch"] and len(parts) == 2:
            key = parts[1]
            if not host:
                self._json(503, {"error": "Moonlight host not configured yet. Edit config.json after pairing."})
                return
            app_name = config.get("apps", {}).get(key)
            if not app_name:
                self._json(404, {"error": f"No app configured for {key}"})
                return
            subprocess.Popen(
                ["flatpak", "run", "com.moonlight_stream.Moonlight", "stream", host, app_name],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            self._json(200, {"status": "launching", "app": app_name, "host": host})
            return

        if parts == ["quit"]:
            if not host:
                self._json(503, {"error": "Moonlight host not configured yet."})
                return
            subprocess.Popen(
                ["flatpak", "run", "com.moonlight_stream.Moonlight", "quit", host],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            self._json(200, {"status": "quitting"})
            return

        self._json(404, {"error": "not found"})


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 7777), Handler)
    print("moonlight-launcher listening on 127.0.0.1:7777", flush=True)
    server.serve_forever()
