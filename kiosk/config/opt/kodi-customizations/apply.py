#!/usr/bin/env python3
"""Re-apply the kiosk's Kodi (Estuary skin) customizations.

These edits live under /usr/share/kodi/addons/skin.estuary, which is owned
by the 'kodi' apt package -- a package upgrade silently reverts them. This
script re-applies them and is run at boot (before the kiosk session starts
Kodi) by kodi-skin-customizations.service.

It is idempotent (a marker check skips already-applied files) and patches
in place rather than overwriting whole files, so it layers cleanly onto
whatever skin version is currently installed instead of clobbering it with
a stale copy.
"""
import os
import shutil

SKIN = "/usr/share/kodi/addons/skin.estuary"
SRC = "/opt/kodi-customizations"


def patch_file(path, old, new, marker):
    name = os.path.basename(path)
    if not os.path.exists(path):
        return f"{name}: missing, skipped"
    with open(path) as f:
        content = f.read()
    if marker in content:
        return f"{name}: already applied"
    if old not in content:
        return f"{name}: anchor not found, skipped"
    with open(path, "w") as f:
        f.write(content.replace(old, new, 1))
    return f"{name}: PATCHED"


# 1. Rounded-corner mask texture used by the InfoWall thumbnail diffuse.
try:
    shutil.copyfile(f"{SRC}/rounded_mask.png", f"{SKIN}/media/rounded_mask.png")
    print("rounded_mask.png: copied")
except OSError as e:
    print(f"rounded_mask.png: copy failed ({e})")

# 2. Rounded corners on the Favourites / InfoWall thumbnail (first occurrence
#    is the music/favourites layout, which is what the Favourites Wall view
#    uses).
print(patch_file(
    f"{SKIN}/xml/View_54_InfoWall.xml",
    '<texture fallback="$PARAM[fallback_image]" background="true">$VAR[InfoWallThumbVar]</texture>',
    '<texture diffuse="rounded_mask.png" fallback="$PARAM[fallback_image]" background="true">$VAR[InfoWallThumbVar]</texture>',
    'diffuse="rounded_mask.png"',
))

# 3. Suppress Kodi's built-in volume OSD (the kiosk draws its own thin
#    top-edge volume bar instead).
print(patch_file(
    f"{SKIN}/xml/DialogVolumeBar.xml",
    '<visible>!Window.IsActive(startup) + !Window.IsActive(GameVolume)</visible>',
    '<visible>false</visible>',
    '<visible>false</visible>',
))
