#!/usr/bin/env python3
"""Remaps the Mac Mini built-in Apple IR receiver into TV-remote navigation.

Ring (Volume Up/Down):  navigate Up/Down. (Volume itself is intentionally not
                         handled here -- use the TV's own remote for volume
                         and power. An earlier version routed it through
                         Kodi's JSON-RPC volume with double-press detection,
                         but that added a mandatory ~0.35s delay before every
                         single Up/Down press could fire, since the remap had
                         to wait to see whether a second press followed.)
Ring (Back/Forward):    navigate Left/Right.
Center (Play/Pause):    Enter (select).
Menu:                   short press = go back within whatever has focus
                         (Kodi gets Escape/PreviousMenu, anything else
                         such as Firefox gets browser-style Alt+Left).
                         long press = stop Kodi playback, reset Kodi to
                         its default state, and return to the kiosk home
                         screen.

Idle recovery: the React kiosk app can get into a bad state if left running
for a long time. So we track a "last activity" clock -- bumped by any remote
press and kept fresh while Kodi is playing -- and when the remote is used
again after a long idle gap, we recover the app (restart Firefox by default,
or hard-refresh it) before handling input. The wake press itself is swallowed.
"""
import json
import os
import subprocess
import threading
import time
import urllib.request

import evdev
from evdev import UInput, ecodes as e

DEVICE_NAME = os.environ.get("IR_REMAP_DEVICE_NAME", "Apple, Inc. IR Receiver")
LONG_PRESS_THRESHOLD = 0.6  # seconds
HOME_URL = "http://localhost/home"
KODI_JSONRPC_URL = "http://localhost:8080/jsonrpc"

# --- Idle recovery -----------------------------------------------------------
# How long with no remote events AND no Kodi playback before the next remote
# press triggers a recovery of the kiosk app.
IDLE_RECOVERY_SECONDS = 3600  # 1 hour
# What to do on that wake press:
#   "restart" -- kill Firefox; the ~/.xinitrc relaunch loop starts it fresh.
#                Most reliable: recovers even a fully hung tab. ~3-4s blackout.
#   "reload"  -- send Ctrl+Shift+R for a hard refresh. Lighter and keeps you
#                in place, but won't help if the page is truly wedged.
RECOVERY_ACTION = "restart"
# pkill pattern that matches the kiosk Firefox (and only it).
FIREFOX_MATCH = "firefox.*mozkiosk"
# How often the background watcher checks whether Kodi is playing.
PLAYBACK_POLL_SECONDS = 60

_activity_lock = threading.Lock()
_last_activity = time.monotonic()

CAPABILITIES = {
    e.EV_KEY: [
        e.KEY_UP, e.KEY_DOWN, e.KEY_LEFT, e.KEY_RIGHT, e.KEY_ENTER,
        e.KEY_ESC, e.KEY_LEFTALT,
    ]
}


def find_device():
    for path in evdev.list_devices():
        dev = evdev.InputDevice(path)
        if dev.name == DEVICE_NAME:
            return dev
    return None


def kodi_rpc(method, params=None):
    payload = {"jsonrpc": "2.0", "method": method, "id": 1}
    if params is not None:
        payload["params"] = params
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        KODI_JSONRPC_URL, data=body, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=2) as resp:
        return json.loads(resp.read())


def kodi_is_playing():
    try:
        return bool(kodi_rpc("Player.GetActivePlayers").get("result"))
    except Exception:
        return False


def mark_activity():
    global _last_activity
    with _activity_lock:
        _last_activity = time.monotonic()


def idle_seconds():
    with _activity_lock:
        return time.monotonic() - _last_activity


def recover_app():
    """Recover the kiosk web app after a long idle period."""
    def _do():
        try:
            if RECOVERY_ACTION == "reload":
                subprocess.run(["wmctrl", "-s", "0"], timeout=3)
                subprocess.run(
                    ["xdotool", "search", "--class", "firefox",
                     "windowactivate", "--sync",
                     "key", "--clearmodifiers", "ctrl+shift+r"],
                    timeout=6,
                )
            else:  # "restart"
                # The ~/.xinitrc loop relaunches Firefox fresh at the home URL.
                subprocess.run(["pkill", "-f", FIREFOX_MATCH], timeout=5)
        except Exception:
            pass

    threading.Thread(target=_do, daemon=True).start()


def playback_watch():
    """Keep the activity clock fresh while Kodi is playing, so a long movie
    with no remote presses never counts as idle."""
    while True:
        if kodi_is_playing():
            mark_activity()
        time.sleep(PLAYBACK_POLL_SECONDS)


def go_home():
    def _request():
        try:
            urllib.request.urlopen(HOME_URL, timeout=5)
        except Exception:
            pass

    threading.Thread(target=_request, daemon=True).start()


def active_window_name():
    try:
        result = subprocess.run(
            ["xdotool", "getactivewindow", "getwindowname"],
            capture_output=True, text=True, timeout=2,
        )
        return result.stdout.strip()
    except Exception:
        return ""


class HoldButton:
    """Tracks short-press vs. long-press (hold-and-release) for one button."""

    def __init__(self, short_action, long_action, threshold):
        self.short_action = short_action
        self.long_action = long_action
        self.threshold = threshold
        self.press_time = None

    def down(self):
        self.press_time = time.monotonic()

    def up(self):
        if self.press_time is None:
            return
        held = time.monotonic() - self.press_time
        self.press_time = None
        if held >= self.threshold:
            self.long_action()
        else:
            self.short_action()


def main():
    dev = find_device()
    if dev is None:
        raise SystemExit(f"Device '{DEVICE_NAME}' not found")

    dev.grab()
    ui = UInput(CAPABILITIES, name="ir-remap-virtual-keyboard")

    def tap(code):
        ui.write(e.EV_KEY, code, 1)
        ui.write(e.EV_KEY, code, 0)
        ui.syn()

    def alt_left():
        ui.write(e.EV_KEY, e.KEY_LEFTALT, 1)
        ui.syn()
        ui.write(e.EV_KEY, e.KEY_LEFT, 1)
        ui.write(e.EV_KEY, e.KEY_LEFT, 0)
        ui.syn()
        ui.write(e.EV_KEY, e.KEY_LEFTALT, 0)
        ui.syn()

    def go_back():
        name = active_window_name()
        if "Kodi" in name:
            tap(e.KEY_ESC)
        else:
            alt_left()

    menu_button = HoldButton(go_back, go_home, LONG_PRESS_THRESHOLD)

    mark_activity()
    threading.Thread(target=playback_watch, daemon=True).start()

    print(f"Listening on {dev.path} ({dev.name})", flush=True)
    for ev in dev.read_loop():
        if ev.type != e.EV_KEY:
            continue

        # Any key-down counts as user activity. If the remote has been idle
        # (and nothing was playing) for too long, the first press wakes/recovers
        # the kiosk app and is otherwise swallowed.
        if ev.value == 1:
            if idle_seconds() >= IDLE_RECOVERY_SECONDS:
                mark_activity()
                recover_app()
                continue
            mark_activity()

        if ev.code == e.KEY_MENU:
            if ev.value == 1:
                menu_button.down()
            elif ev.value == 0:
                menu_button.up()
            continue

        if ev.value != 1:  # key-down only for everything else
            continue
        if ev.code == e.KEY_VOLUMEUP:
            tap(e.KEY_UP)
        elif ev.code == e.KEY_VOLUMEDOWN:
            tap(e.KEY_DOWN)
        elif ev.code == e.KEY_BACK:
            tap(e.KEY_LEFT)
        elif ev.code == e.KEY_FORWARD:
            tap(e.KEY_RIGHT)
        elif ev.code in (e.KEY_PLAYPAUSE, e.KEY_ENTER):
            tap(e.KEY_ENTER)


if __name__ == "__main__":
    main()
