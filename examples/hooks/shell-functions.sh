#!/usr/bin/env bash

# Source this file from bash/zsh:
#   source examples/hooks/shell-functions.sh

_404gent_root() {
  local script="${BASH_SOURCE[0]:-${(%):-%x}}"
  cd "$(dirname "$script")/../.." >/dev/null 2>&1 && pwd
}

_404gent_cli() {
  if command -v 404gent >/dev/null 2>&1; then
    404gent "$@"
    return $?
  fi

  node "$(_404gent_root)/src/cli.js" "$@"
}

guard-prompt() {
  _404gent_cli scan-prompt "$@"
  local code=$?
  if [ "$code" -eq 10 ]; then
    return 10
  fi
  return 0
}

guard-run() {
  _404gent_cli run -- "$@"
}

guard-agent-prompt() {
  local prompt="$1"
  shift

  guard-prompt "$prompt" || return $?
  "$@" "$prompt"
}

guard-codex() {
  local prompt="$*"

  if [ -z "$prompt" ]; then
    printf "usage: guard-codex <prompt>\n" >&2
    return 64
  fi

  guard-prompt "$prompt" || return $?
  _404gent_cli agent --name codex --prompt "$prompt" -- codex --cd "$PWD" "$prompt"
}

guard-status() {
  _404gent_cli status "$@"
}

guard-status-sync() {
  _404gent_cli status sync
}
