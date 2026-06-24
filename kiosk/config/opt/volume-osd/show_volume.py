#!/usr/bin/env python3
"""One-shot volume OSD: a thin full-width bar that slides down from the
very top edge of the screen, animates its fill from the previous volume
to the new one, holds briefly, then slides back up and exits. Spawned
fresh on every volume change by ir-remap.py so there's no persistent
daemon/socket to manage.

Colors and easing match the React app's own design language (see
src/index.css for the palette, src/components/*.css for the
cubic-bezier(0.22, 1, 0.36, 1) "ease-out, slight overshoot-free settle"
curve used throughout its entrance animations).

A pidfile guards against overlapping instances: pressing volume up/down
twice in quick succession kills the still-running previous bar (its
window disappears the instant the process dies, since X discards windows
owned by a closed connection) before drawing the new one, so only ever
one bar is on screen at a time.

Override-redirect so it bypasses normal window-manager bookkeeping
entirely -- it's drawn straight to the screen and is visible above
whichever virtual desktop is currently active (Firefox kiosk or hidden
Kodi), with no "always on top" plumbing needed.
"""
import os
import signal
import subprocess
import sys
import tkinter as tk

THICKNESS = 5
CAP_RADIUS = THICKNESS / 2

HOLD_MS = 1100
SLIDE_DURATION_MS = 220
FILL_DURATION_MS = 260
FRAME_MS = 10

# --accent-blue / --surface from src/index.css.
TRACK = "#1c1c22"
FILL = "#0a84ff"

PIDFILE = "/tmp/volume-osd.pid"


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def kill_existing():
    try:
        with open(PIDFILE) as f:
            old_pid = int(f.read().strip())
        os.kill(old_pid, signal.SIGTERM)
    except (FileNotFoundError, ValueError, ProcessLookupError):
        pass


def write_pidfile():
    with open(PIDFILE, "w") as f:
        f.write(str(os.getpid()))


def clear_pidfile_if_self():
    try:
        with open(PIDFILE) as f:
            if int(f.read().strip()) == os.getpid():
                os.remove(PIDFILE)
    except (FileNotFoundError, ValueError):
        pass


def main():
    args = sys.argv[1:]
    if len(args) >= 2:
        old_level, new_level = int(args[0]), int(args[1])
    elif len(args) == 1:
        old_level = new_level = int(args[0])
    else:
        old_level = new_level = 0
    old_level = max(0, min(100, old_level))
    new_level = max(0, min(100, new_level))

    kill_existing()
    write_pidfile()

    root = tk.Tk()
    root.overrideredirect(True)
    root.attributes("-topmost", True)
    root.configure(bg=TRACK)

    screen_w = root.winfo_screenwidth()
    start_y = -THICKNESS
    final_y = 0

    root.geometry(f"{screen_w}x{THICKNESS}+0+{start_y}")

    canvas = tk.Canvas(root, width=screen_w, height=THICKNESS, bg=TRACK, highlightthickness=0)
    canvas.pack(fill="both", expand=True)

    fill_rect = canvas.create_rectangle(0, 0, 0, THICKNESS, fill=FILL, outline="")
    fill_cap = canvas.create_oval(0, 0, 0, THICKNESS, fill=FILL, outline="")

    def draw_fill(width):
        width = max(0, min(screen_w, width))
        canvas.coords(fill_rect, 0, 0, max(0, width - CAP_RADIUS), THICKNESS)
        canvas.coords(fill_cap, width - THICKNESS, 0, width, THICKNESS)

    old_w = screen_w * (old_level / 100)
    new_w = screen_w * (new_level / 100)
    draw_fill(old_w)

    root.update_idletasks()

    def animate(elapsed_ms, duration_ms, on_frame, on_done):
        t = min(1.0, elapsed_ms / duration_ms)
        on_frame(ease_out_cubic(t))
        if t < 1.0:
            root.after(FRAME_MS, lambda: animate(elapsed_ms + FRAME_MS, duration_ms, on_frame, on_done))
        else:
            on_done()

    def on_slide_frame(t):
        y = int(start_y + (final_y - start_y) * t)
        root.geometry(f"{screen_w}x{THICKNESS}+0+{y}")

    def on_fill_frame(t):
        draw_fill(old_w + (new_w - old_w) * t)

    def finish():
        clear_pidfile_if_self()
        root.destroy()

    def slide_out():
        animate(0, SLIDE_DURATION_MS, lambda t: on_slide_frame(1 - t), finish)

    def hold():
        root.after(HOLD_MS, slide_out)

    animate(0, SLIDE_DURATION_MS, on_slide_frame, lambda: None)
    animate(0, FILL_DURATION_MS, on_fill_frame, hold)

    root.mainloop()


if __name__ == "__main__":
    main()
