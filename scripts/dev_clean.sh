#!/usr/bin/env bash
# Usage:
#   ./dev_clean.sh
#   To disable port checks: CHECK_PORTS=false ./dev_clean.sh
CHECK_PORTS=${CHECK_PORTS:-true}

set -euo pipefail

# 1) Free server port if in use
./kill.sh 29999

# 2) Free client port if in use
./kill.sh 39999

# 3) Start the server
echo "Starting server on port 29999..."
npm run --prefix forest_server dev &
p1=$!

# 4) Start the client
echo "Starting client on port 39999..."
npm run --prefix forest_client dev &
p2=$!

# 5) Wait for one to exit, then shut down the other
wait -n
exit_code=$?

if [[ $exit_code -le 1 ]]; then
  [[ -n "${p1-}" ]] && kill "$p1" 2>/dev/null || true
  [[ -n "${p2-}" ]] && kill "$p2" 2>/dev/null || true
fi

wait
