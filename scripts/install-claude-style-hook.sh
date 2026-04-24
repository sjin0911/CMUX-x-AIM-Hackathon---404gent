#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${TARGET:-$ROOT/.claude/settings.local.json}"
DRY_RUN=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 64
      ;;
  esac
done

HOOK="$ROOT/examples/hooks/claude-code-404gent.sh"

node - "$ROOT" "$TARGET" "$HOOK" "$DRY_RUN" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const [, , root, target, hook, dryRunRaw] = process.argv;
const dryRun = dryRunRaw === "1";

const existing = fs.existsSync(target)
  ? JSON.parse(fs.readFileSync(target, "utf8"))
  : {};

const next = structuredClone(existing);
next.hooks ??= {};

mergeHook(next.hooks, "UserPromptSubmit", "", hook);
mergeHook(next.hooks, "PreToolUse", "Bash", hook);

if (dryRun) {
  process.stdout.write(`${JSON.stringify(next, null, 2)}\n`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
if (fs.existsSync(target)) {
  const backup = `${target}.bak.${Date.now()}`;
  fs.copyFileSync(target, backup);
  console.error(`backup: ${backup}`);
}

fs.writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.error(`installed 404gent hook: ${target}`);

function mergeHook(hooks, eventName, matcher, command) {
  hooks[eventName] ??= [];
  const block = hooks[eventName].find((entry) => entry.matcher === matcher);
  const hookEntry = {
    type: "command",
    command
  };

  if (!block) {
    hooks[eventName].push({
      matcher,
      hooks: [hookEntry]
    });
    return;
  }

  block.hooks ??= [];
  const exists = block.hooks.some((entry) => {
    return entry.type === "command" && entry.command === command;
  });

  if (!exists) {
    block.hooks.push(hookEntry);
  }
}
NODE

