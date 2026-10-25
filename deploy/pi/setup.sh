#!/usr/bin/env bash
# One-time setup on the Raspberry Pi:
#   curl -fsSL https://raw.githubusercontent.com/jrmc247/chores-calendar/main/deploy/pi/setup.sh | sudo bash
# Safe to run again, e.g. after the timer files change.
set -euo pipefail

repo=https://github.com/jrmc247/chores-calendar.git
dir=/opt/chores-calendar

if [[ $EUID -ne 0 ]]; then
  echo "Run this with sudo." >&2
  exit 1
fi

apt-get update -q
apt-get install -y -q git nodejs

# The server needs Node 20 or newer; older Pi OS versions ship Node 18.
if (( $(node -p 'process.versions.node.split(".")[0]') < 20 )); then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

if [[ ! -d "$dir/.git" ]]; then
  git clone --quiet --depth 1 --single-branch --branch deploy "$repo" "$dir"
fi

# The app's own server answers on port 80 now, so nginx has to step aside.
systemctl disable --now nginx 2>/dev/null || true

cp "$dir/deploy/pi/chores-deploy.service" "$dir/deploy/pi/chores-deploy.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now chores-deploy.timer

"$dir/deploy/pi/update.sh" --force
echo "Done. Open http://$(hostname).local/ on any device in your network."
