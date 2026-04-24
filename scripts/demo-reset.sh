#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$ROOT/src/cli.js" audit reset
node "$ROOT/src/cli.js" status reset

