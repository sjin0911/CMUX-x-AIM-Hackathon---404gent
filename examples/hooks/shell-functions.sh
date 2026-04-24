#!/usr/bin/env bash

# Source this file from bash/zsh:
#   source examples/hooks/shell-functions.sh

guard-prompt() {
  404gent scan-prompt "$@"
  local code=$?
  if [ "$code" -eq 10 ]; then
    return 10
  fi
  return 0
}

guard-run() {
  404gent run -- "$@"
}

guard-agent-prompt() {
  local prompt="$1"
  shift

  guard-prompt "$prompt" || return $?
  "$@" "$prompt"
}

guard-status() {
  404gent status "$@"
}

guard-status-sync() {
  404gent status sync
}

