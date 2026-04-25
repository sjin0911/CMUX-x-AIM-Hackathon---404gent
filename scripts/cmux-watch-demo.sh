#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SURFACE="${1:-surface:2}"

printf "\n== cmux screen watch demo ==\n"
printf "This demo is intended to run inside cmux.\n"
printf "\nPane 1: run this watcher:\n"
printf "  node %s/src/cli.js cmux-watch --surface %s --lines 200 --interrupt\n" "$ROOT" "$SURFACE"
printf "\nPane 2 (%s): run this long process:\n" "$SURFACE"
printf "  node -e 'setTimeout(() => { console.log(\"OPENAI_API_KEY=sk-1234567890abcdefghijklmnop\"); setInterval(() => console.log(\"still running\"), 500); }, 1000)'\n"
printf "\nThe watcher reads the target surface, detects secret output, records audit/state/cmux events, and sends ctrl+c to the same surface.\n"
