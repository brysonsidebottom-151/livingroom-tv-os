# Living-Room TV OS — Operations Manual

The whole home-theater system: a custom React "TV OS" running full-screen on
a Mac Mini, backed by a separate media/automation server. This document is the
single source of truth for how it's wired, how to recover it, and what's left
to finish.

> The React app source lives one level up (`../src`). **This `kiosk/` folder is
> the backup + ops record for everything that lives _outside_ the app** — the
> system config that only exists on the Mac Mini.

---

## 1. The two machines

| Machine | Role | Address | Notes |
|---|---|---|---|
| **Mac Mini** (`livingroomtv`) | The TV itself — kiosk UI on the screen | `192.168.68.123` (Wi-Fi `robbottomus`) | 2012 Mac Mini. Ethernet (`enp1s0f0`) is configured but unplugged; Wi-Fi `wlp2s0b1` is the live link. |
| **planohouse** | Media + home automation server | `192.168.254.190` | Docker host: Jellyfin, Navidrome, Home Assistant, Pi-hole. |

The two are on different subnets (`192.168.68.x` ↔ `192.168.254.x`) but the
router **routes between them** — the kiosk reaches planohouse fine over Wi-Fi.

---

## 2. How the Mac Mini boots into the kiosk

Fully automatic and reboot-survivable — no display manager:

```
power on
  └─ getty@tty1  (autologin as user "kiosk"  — /etc/systemd/system/getty@tty1.service.d/override.conf)
       └─ ~/.bash_profile  →  exec startx
            └─ ~/.xinitrc   (the master kiosk script)
                 ├─ xrandr 1080p, screen-blanking off, hide cursor
                 ├─ openbox (WM) + onboard (on-screen kbd)
                 ├─ kodi --standalone   → moved to virtual desktop 1 (hidden)
                 └─ firefox --kiosk http://localhost/   (on desktop 0, in a relaunch loop)
```

Two virtual desktops: **desktop 0** = Firefox (the visible UI), **desktop 1** =
Kodi (hidden, brought forward only when playing media). The Firefox loop forces
desktop 0 on every (re)launch so a crash can't strand it behind Kodi.

---

## 3. Services (all `systemctl enable`d → start on boot)

| Service | Port | What it does |
|---|---|---|
| `nginx` | 80 | Serves the built React app from `/var/www/livingroom-tv-os` |
| `moonlight-launcher` | 7777 (localhost) | The glue. Routes app tiles to Kodi or Moonlight, and `/home` recovery (see §5). |
| `ir-remap` | — | Maps the Apple IR remote into keyboard nav + volume + home (see §4). |
| `kodi-skin-customizations` | — | Oneshot at boot: re-applies the Kodi skin tweaks that a Kodi package upgrade would otherwise wipe (see §6). |

Plus the **volume OSD** (`/opt/volume-osd/show_volume.py`) — spawned on demand
by `ir-remap`, not a daemon. A thin blue bar that slides down from the top edge.

---

## 4. The Apple IR remote (`/opt/ir-remap/ir-remap.py`)

| Button | Short press | Double / long |
|---|---|---|
| Ring **up / down** | Navigate up / down | **Double:** volume ±10 (+ on-screen bar) |
| Ring **left / right** | Navigate left / right | — |
| **Center** | Select / Enter | — |
| **Menu** | Back (context-aware: Esc in Kodi, Alt+← in Firefox) | **Long press:** go Home |

Volume is driven through **Kodi's JSON-RPC `Application.SetVolume`**, not the
ALSA mixer — Kodi re-syncs its own level onto any mixer control and would
otherwise stomp external changes. Kodi's own built-in volume bar is hidden so
only our top-edge bar shows.

---

## 5. App tiles & how each one opens (`../src/apps.tsx`)

| Tile | Kind | Behavior |
|---|---|---|
| YouTube | external | Full-page nav to `youtube.com/tv` |
| Jellyfin | launcher | Switches to Kodi → Favourites (Search / Featured / TV Shows / Movies) |
| Navidrome | launcher | Switches to Kodi → Subsonic music addon |
| Stremio | external | Full-page nav to `web.stremio.com` |
| Home Assistant | server | Shows status; when reachable, navigates to HA (`:8123`) |
| Max | external | Full-page nav to `play.max.com` |
| Steam / Xbox | launcher | Moonlight stream — **needs setup, see §8** |

**Going home from an "external" page** (YouTube/Stremio/Max/HA): these navigate
Firefox's whole page away, so the app's JS is gone. Long-press Menu → the
launcher's `/home` notices Firefox is no longer on the kiosk page (by window
title) and **kills Firefox**; the `.xinitrc` loop relaunches it at
`http://localhost/`. Going home from **Kodi** is detected by polling Kodi's
JSON-RPC for the Home window, then switching desktops back.

---

## 6. Kodi customizations & why they need a guardian

Kodi runs the **Estuary** skin with two edits, **and the Favourites/views are
preset** (Wall view for Favourites, Poster view for TV/Movies). The two skin
edits live in `/usr/share/kodi/addons/skin.estuary/` — a package-owned dir, so
**a `kodi` apt upgrade silently reverts them.**

- Rounded-corner thumbnails — a `diffuse` mask (`rounded_mask.png`) on the
  InfoWall thumbnail texture in `View_54_InfoWall.xml`.
- Built-in volume bar hidden — `<visible>false</visible>` in `DialogVolumeBar.xml`.

`kodi-skin-customizations.service` re-applies both at every boot via
`/opt/kodi-customizations/apply.py` (idempotent, patch-based — layers onto
whatever skin version is installed). **After a Kodi update, just reboot** (or
run the script) to get the look back.

---

## 7. Backup & full recovery

`kiosk-config-backup.tar.gz` here is a complete snapshot of all custom config
on the Mac Mini. The `config/` folder is the same, extracted for browsing.

**Re-snapshot** (run on the Mac Mini after any config change):
```sh
sudo /opt/kiosk-backup.sh /tmp/kiosk-config-backup.tar.gz
# then copy it back into this folder
```

**Restore onto a fresh/reinstalled Mac Mini** (paths are absolute in the tar):
```sh
sudo tar -xzPf kiosk-config-backup.tar.gz          # drops every file back in place
sudo systemctl daemon-reload
sudo systemctl enable ir-remap moonlight-launcher kodi-skin-customizations nginx
# set kiosk autologin (override.conf is in the tar), install: firefox, kodi,
# openbox, onboard, unclutter, wmctrl, xdotool, python3-evdev, python3-tk,
# nginx, the JellyCon + Subsonic Kodi addons, then reboot.
```
Rebuild & redeploy the React app:
```sh
cd livingroom-tv-os && npm run build
sudo rsync -a --delete dist/ /var/www/livingroom-tv-os/    # or tar-copy
```

---

## 8. Remaining manual steps (the "not finished" list)

1. **Steam / Xbox tiles** — `/opt/moonlight-launcher/config.json` has an empty
   `host`. Pair Moonlight with **Sunshine** on the gaming PC, then set the PC's
   IP as `host` (and the app names). Until then those two tiles do nothing.
2. **Media libraries are empty** — Jellyfin's permanent **Movies** and
   **TV Shows** libraries have 0 items. Copy media onto planohouse's HDDs so the
   Jellyfin → TV Shows / Movies tiles have something to show.
3. **Rotating movies = 3, target was 5** — the auto-rotation (runs on
   planohouse) currently has 3 titles. Check its script/cron if you want the
   full 5 and the twice-monthly refresh.
4. **Pi-hole isn't filtering anything yet** — it answers DNS at
   `192.168.254.190` but nothing points at it. To go network-wide, set the
   router's DHCP to hand out `192.168.254.190` as the DNS server. (Deliberately
   *not* set on the kiosk alone, so the TV doesn't lose DNS when planohouse is
   down.)
5. **No HDMI-CEC** — verified at the hardware level: this Mac Mini has no CEC
   pin wired to the HDMI port, so the TV's power/volume can't be driven over
   HDMI. Would require a USB-CEC adapter (e.g. Pulse-Eight).

---

## 9. Credentials & key facts

| Thing | Value |
|---|---|
| Mac Mini login / sudo | user `kiosk` (autologin); admin user `bryson`, password `237681` |
| Wi-Fi | SSID `robbottomus` / `grantbing` |
| Home Assistant | `bryson` / `HAPlanoHouse7q` — Plano TX, Central time, °F (change pw in HA profile if desired) |
| Navidrome | `bryson` / `NavPlanoHouse7q` |
| Jellyfin | admin account created during setup; API key + user id in `../.env` |
| planohouse Jellyfin libraries | Movies (Library) · Movies (Rotating) · TV Shows |

---

## 10. Common tasks cheat-sheet

```sh
# Force the TV back to the home screen (same as long-press Menu):
curl http://localhost/home

# Restart a service:
sudo systemctl restart moonlight-launcher    # or ir-remap, nginx

# See why the kiosk UI is misbehaving:
sudo journalctl -u moonlight-launcher -n 50
tail -n 50 ~/.kodi/temp/kodi.log             # as the kiosk user

# Re-apply Kodi skin tweaks without a reboot:
sudo python3 /opt/kodi-customizations/apply.py

# Reload the React app after deploying a new build (picks up index.html):
sudo pkill -9 -u kiosk firefox               # the .xinitrc loop relaunches it
```
