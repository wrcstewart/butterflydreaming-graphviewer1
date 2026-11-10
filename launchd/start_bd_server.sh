#!/bin/zsh
# Run by launchd (uk.virtualfictions.bd.server) at login and whenever the
# server exits. Waits for Memgraph first: server.js loads its helper messages
# ONCE at boot, so starting before port 7687 is open leaves BD running without
# them. Gives up waiting after 10 minutes and starts anyway, so a broken Docker
# is visible in the log rather than hidden behind a server that never starts.
cd "$HOME/butterflydreaming_graphviewer1" || exit 1
for i in {1..300}; do
  /usr/bin/nc -z localhost 7687 2>/dev/null && break
  [ $i = 1 ] && echo "[launchd] $(date '+%F %T') waiting for Memgraph on 7687"
  sleep 2
done
echo "[launchd] $(date '+%F %T') starting node server.js"
exec /opt/homebrew/bin/node server.js
