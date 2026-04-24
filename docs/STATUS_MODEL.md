# Status Model

404gent keeps a lightweight state file at `.404gent/state.json` so cmux can show the current risk posture of each guarded agent, surface, or local session.

## Why Not Terminal Assignment First

For a hackathon MVP, assigning and owning terminals directly is heavier than necessary. cmux already provides workspace and surface context through environment variables, and 404gent already knows explicit agent names from:

```bash
404gent agent --name codex --prompt "..." -- codex
```

So the MVP tracks:

- `agent:<name>` when using `404gent agent`
- `surface:<CMUX_SURFACE_ID>` when running inside a cmux surface without an agent name
- `workspace:<CMUX_WORKSPACE_ID>` when only workspace context exists
- `local` outside cmux

## Status Levels

| Status | Meaning | cmux Color |
| --- | --- | --- |
| `clean` | No findings yet | green |
| `warning` | Suspicious but not blocked | orange |
| `danger` | A blocking event occurred | red |
| `contaminated` | Prompt injection, guardrail tampering, secret leak, exfiltration, RCE, malware, or backdoor-like behavior was detected | purple |

`contaminated` is sticky. A later safe command does not erase it automatically. Use `status reset` after review.

## Commands

```bash
404gent status
404gent status --agent codex
404gent status sync
404gent status reset
404gent status reset --agent codex
```

`status sync` pushes the current state back into cmux sidebar status entries.

## Shell Shortcut

```bash
source examples/hooks/shell-functions.sh
guard-status
guard-status --agent codex
guard-status-sync
```

## About `/status`

Inside a normal shell, `/status` is interpreted as a filesystem path, so the portable command is `404gent status`.

If a specific agent supports custom slash commands, the slash command should call:

```bash
404gent status --agent <agent-name>
```

That gives the same user experience without depending on terminal-specific parsing.

## cmux Sidebar

When cmux is available, every state update calls:

```bash
cmux set-status "404gent:<target>" "<status>" --icon ... --color ...
```

This means each guarded agent can have a separate sidebar pill:

- `404gent:agent:codex`
- `404gent:agent:gemini`
- `404gent:surface:<id>`

