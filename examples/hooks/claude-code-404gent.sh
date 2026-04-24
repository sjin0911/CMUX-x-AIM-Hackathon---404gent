#!/usr/bin/env bash
set -uo pipefail

# Claude Code-style hook template.
# Reads a hook JSON payload from stdin, extracts prompt/command-like fields,
# and blocks only when 404gent returns exit code 10.

ROOT="${FOURGENT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
EVENT="$(cat)"

guard_cli() {
  if command -v 404gent >/dev/null 2>&1; then
    404gent "$@"
  else
    node "$ROOT/src/cli.js" "$@"
  fi
}

notify_cmux() {
  local title="$1"
  local body="$2"
  if command -v cmux >/dev/null 2>&1; then
    cmux notify --title "$title" --body "$body" >/dev/null 2>&1 || true
  fi
}

extract_field() {
  local field="$1"
  node -e '
    const fs = require("node:fs");
    const field = process.argv[1];
    const input = fs.readFileSync(0, "utf8");
    let event = {};
    try { event = JSON.parse(input); } catch {}

    const candidates = field === "prompt"
      ? [
          event.prompt,
          event.user_prompt,
          event.message,
          event.input?.prompt,
          event.tool_input?.prompt
        ]
      : [
          event.command,
          event.tool_input?.command,
          event.tool_input?.cmd,
          event.input?.command,
          event.parameters?.command
        ];

    const value = candidates.find((item) => typeof item === "string" && item.trim());
    if (value) process.stdout.write(value);
  ' "$field" <<<"$EVENT"
}

scan_or_block() {
  local kind="$1"
  local text="$2"
  local output
  local code

  set +e
  if [ "$kind" = "prompt" ]; then
    output="$(guard_cli scan-prompt "$text" 2>&1)"
  else
    output="$(guard_cli scan-command "$text" 2>&1)"
  fi
  code=$?
  set -e

  printf "%s\n" "$output" >&2

  if [ "$code" -eq 10 ]; then
    notify_cmux "404gent blocked Claude Code" "$kind guard blocked a risky action"
    exit 2
  fi

  if [ "$code" -eq 2 ]; then
    notify_cmux "404gent warning" "$kind guard raised a warning"
  fi
}

PROMPT="$(extract_field prompt)"
COMMAND="$(extract_field command)"

if [ -n "$PROMPT" ]; then
  scan_or_block prompt "$PROMPT"
fi

if [ -n "$COMMAND" ]; then
  scan_or_block command "$COMMAND"
fi

exit 0

