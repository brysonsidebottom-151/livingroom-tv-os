#!/bin/sh
export LIBVA_DRIVER_NAME=i965
export MOZ_X11_EGL=1
xrandr --output HDMI-3 --mode 1920x1080 --rotate normal
xset s off
xset -dpms
xset s noblank
unclutter -idle 0.5 -root &
openbox &
onboard &

kodi --standalone &
(
  for i in $(seq 1 60); do
    WIN=$(wmctrl -l 2>/dev/null | grep -i kodi | awk '{print $1}')
    if [ -n "$WIN" ]; then
      wmctrl -i -r "$WIN" -t 1
      break
    fi
    sleep 1
  done
) &

wmctrl -s 0

until curl -sf -o /dev/null http://localhost/; do
  sleep 1
done

mkdir -p /home/kiosk/.mozkiosk
while true; do
  wmctrl -s 0 2>/dev/null
  firefox --kiosk --no-remote --profile /home/kiosk/.mozkiosk http://localhost/
  sleep 2
done
