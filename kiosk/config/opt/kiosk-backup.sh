#!/bin/sh
# Bundles every piece of custom kiosk config that lives only on this box
# (everything outside the React app repo) into a single tarball, so the
# whole living-room TV OS can be rebuilt after a disk failure or reinstall.
# Paths are stored absolute (tar -P) so extraction with -P drops each file
# back where it belongs. Run with sudo.
OUT="${1:-/tmp/kiosk-config-backup.tar.gz}"
tar -czPf "$OUT" \
  /opt/ir-remap/ir-remap.py \
  /opt/volume-osd/show_volume.py \
  /opt/moonlight-launcher/launcher.py \
  /opt/moonlight-launcher/config.json \
  /opt/kodi-customizations/apply.py \
  /opt/kodi-customizations/rounded_mask.png \
  /opt/kiosk-backup.sh \
  /home/kiosk/.xinitrc \
  /home/kiosk/.bash_profile \
  /home/kiosk/.kodi/userdata/favourites.xml \
  /home/kiosk/.kodi/userdata/guisettings.xml \
  /home/kiosk/.kodi/userdata/addon_data/plugin.video.jellycon \
  /home/kiosk/.kodi/userdata/addon_data/plugin.audio.subsonic/settings.xml \
  /etc/asound.conf \
  /etc/nginx/sites-available/livingroom-tv-os \
  /etc/systemd/system/ir-remap.service \
  /etc/systemd/system/moonlight-launcher.service \
  /etc/systemd/system/kodi-skin-customizations.service \
  /etc/systemd/system/getty@tty1.service.d \
  2>/dev/null
echo "wrote $OUT"
tar -tzf "$OUT" | wc -l | sed 's/^/files: /'
