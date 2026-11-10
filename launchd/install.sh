#!/bin/zsh
# Installs (or reinstalls) the three login jobs that keep BD up across reboots.
# Safe to re-run. Run it after restoring onto a new machine, or after editing
# a plist here. Stop a job with:  launchctl bootout gui/$UID/<label>
set -e
cd "$(dirname "$0")"
D=~/Library/LaunchAgents
docker update --restart unless-stopped memgraph-dev >/dev/null 2>&1 \
  && echo "memgraph-dev: restart=unless-stopped" \
  || echo "memgraph-dev: Docker not running — re-run once it is, to set the restart policy"
for p in uk.virtualfictions.bd.{docker,cloudflared,server}.plist; do
  L=${p%.plist}
  launchctl bootout gui/$UID/$L 2>/dev/null || true
  cp $p $D/$p
  launchctl bootstrap gui/$UID $D/$p
  echo "loaded $L"
done
