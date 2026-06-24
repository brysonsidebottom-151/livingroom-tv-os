# Living Room TV OS

A custom React "OS" home screen for the living room TV, styled after Apple TV.
A horizontally scrolling app bar holds YouTube, Jellyfin, Navidrome, Stremio,
Home Assistant, Max, Steam, and Xbox — the focused icon scales up 20% and
stays centered as you scroll, sliding neighboring icons in from off-screen.
The background is a full-bleed hero of whatever Jellyfin most recently added,
with a "Play in Jellyfin" button that jumps straight into it.

Apps live in one place: [src/apps.tsx](src/apps.tsx). Each entry is either
`kind: "external"` (full navigation to a URL, e.g. YouTube/Stremio/Max/Steam/
Xbox) or `kind: "server"` (routes to [AppScreen](src/components/AppScreen.tsx)
backed by a `ServerConfig`, e.g. Jellyfin/Navidrome/Home Assistant). Add a new
tile by adding one entry to that array — the app bar, routing, and status
badges all pick it up automatically.

## Running it

```
npm install
npm run dev      # local dev, http://localhost:5173
npm run build    # production build into dist/
```

## Connecting Jellyfin

The hero image, "Play in Jellyfin" button, and the Jellyfin status dot in the
top bar all come alive once Jellyfin is reachable:

1. Copy `.env.example` to `.env`.
2. Set `VITE_JELLYFIN_SERVER_URL` to the server's base URL, e.g.
   `http://192.168.5.20:8096`.
3. Set `VITE_JELLYFIN_API_KEY` (Dashboard → API Keys in Jellyfin's admin
   settings) and `VITE_JELLYFIN_USER_ID` (Dashboard → Users → click your
   user; the id is in the page URL).
4. On load (and every 30 min — see `RECENT_MOVIE_POLL_INTERVAL_MS` in
   [src/config.ts](src/config.ts)) the app calls
   `/Users/<userId>/Items/Latest?IncludeItemTypes=Movie`, takes the newest
   result, and uses its backdrop image as the hero background.
5. "Play in Jellyfin" deep-links into Jellyfin Web's stable client
   (`/web/index.html#/video?id=...`, built in
   [src/lib/jellyfin.ts](src/lib/jellyfin.ts)). This route is correct as of
   the current Jellyfin Web client, but it's changed its routing scheme
   before — if the button lands on the wrong screen once you have a real
   server, `buildJellyfinPlayUrl` in that file is the one place to fix it.

The Jellyfin app-bar icon is separate from the hero's play button — it goes
to a general Jellyfin connection screen
([src/components/AppScreen.tsx](src/components/AppScreen.tsx)), which you'll
eventually want to swap for an embedded Jellyfin web client.

## Connecting Navidrome and Home Assistant

- Set `VITE_NAVIDROME_SERVER_URL` in `.env` (e.g. `http://192.168.5.20:4533`).
- Set `VITE_HOME_ASSISTANT_SERVER_URL` once Home Assistant is running (e.g.
  `http://192.168.5.18:8123`) — for now this only wires up the status dot
  and a connection screen, same as Navidrome.

YouTube, Stremio, Max, Steam, and Xbox work today as full navigations to
their own web apps (`youtube.com/tv`, `web.stremio.com`, `play.max.com`,
`store.steampowered.com`, `xbox.com/play` for cloud gaming). None of these
can be embedded (they block framing), so selecting one navigates the whole
kiosk browser away; press its back shortcut (e.g. `Alt+Left`) to return to
the home screen.

## App icons

The real brand logos live in [src/assets/icons](src/assets/icons), each
pre-composited onto a 16:9 tile with a matching/brand background color so
they fill the app-bar tiles edge to edge. [src/components/icons.tsx](src/components/icons.tsx)
just wraps each as a component. To swap one out, drop a new source image
somewhere and re-run the same trim → contain-fit → composite steps (find the
content's bounding box, scale it to fit within ~85%/72% of an 800×450
canvas, center it on a solid background) — there's no build step depending
on this, the PNGs are committed directly.

## Running it as the actual TV "OS" on the Mac Mini

The intent is for this to be the only thing the TV ever shows — a kiosk
browser pointed at the built app, launched on login, with no window chrome.

1. `npm run build`, then serve `dist/` locally (e.g. `npx serve dist -p 5000`)
   or point a static file server / launchd job at it so it survives reboots.
2. Launch Chrome/Chromium in kiosk mode pointed at that URL:
   ```
   chromium --kiosk --noerrdialogs --disable-session-crashed-bubble http://localhost:5000
   ```
3. Add that command to a Login Item (or a `launchd` plist) so it starts
   automatically when the Mac Mini boots/wakes.
4. The entrance animation (background fade, top/app bar slide-in) re-plays
   automatically whenever the browser tab regains visibility (e.g. the
   display waking from sleep), without resetting your scroll position — see
   `useWake` in [src/hooks/useWake.ts](src/hooks/useWake.ts).

This 2012 Mac Mini's GPU is dated, so most of the UI sticks to plain CSS
transforms/opacity, which stay GPU-cheap. The one exception is
`backdrop-filter` (real frosted-glass blur) on the "Play in Jellyfin" button
and the app-bar badges — those are the one place worth watching for lag once
this is actually running on the Mac Mini; everything else avoids it.
