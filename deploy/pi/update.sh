#!/usr/bin/env bash
# Pulls the latest build from the deploy branch and restarts the app if it changed.
# chores-deploy.timer runs this every 2 minutes. Pass --force to redeploy anyway.
set -euo pipefail

main() {
  local chores=dist/chores-calendar/browser/chores.json
  local unit=server/chores-calendar.service

  cd /opt/chores-calendar
  git fetch --quiet --depth 1 origin deploy
  if [[ "$(git rev-parse HEAD)" == "$(git rev-parse FETCH_HEAD)" && "${1:-}" != --force ]]; then
    return
  fi

  # A chores.json edited on the Pi wins over the one from GitHub.
  local kept=""
  if ! git diff --quiet -- "$chores"; then
    kept=$(mktemp)
    cp "$chores" "$kept"
  fi
  git reset --quiet --hard FETCH_HEAD
  if [[ -n "$kept" ]]; then
    cp "$kept" "$chores"
    rm "$kept"
    echo "Kept the chores.json edited on the Pi; the one from GitHub is ignored."
  fi

  # The server saves ticks in server/data, so its user must exist and own that folder.
  local user
  user=$(sed -n 's/^User=//p' "$unit")
  id "$user" &>/dev/null || useradd --system --no-create-home "$user"
  install -d -o "$user" server/data
  if ! cmp -s "$unit" /etc/systemd/system/chores-calendar.service; then
    cp "$unit" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable --quiet chores-calendar
  fi
  systemctl restart chores-calendar

  echo "Deployed: $(git log -1 --format=%s)"
}

main "$@"
exit
