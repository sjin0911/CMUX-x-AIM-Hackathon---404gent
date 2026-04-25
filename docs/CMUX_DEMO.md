# cmux Demo Script

`scripts/cmux-demo.sh` is the fastest way to demo 404gent inside cmux.

It shows:

- environment readiness with `doctor`
- policy coverage with `rules summary`
- benign prompt allow
- Korean prompt injection block
- secret exfiltration command block
- reverse shell block
- reconnaissance command warn
- safe command execution with sensitive output redaction
- audit trail summary
- cmux notification, sidebar status, progress, and log updates when cmux is available
- live screen watching with `cmux read-screen` and optional `cmux send-key ctrl+c` interruption

## Run

```bash
npm run demo:cmux
```

or:

```bash
bash scripts/cmux-demo.sh
```

The script is safe for a live demo. Dangerous examples are scanned as text with `scan-command`; they are not executed.

For per-agent wrapper behavior:

```bash
bash scripts/cmux-agent-demo.sh
```

For cmux-native live screen intervention:

```bash
npm run demo:cmux-watch
node src/cli.js cmux-watch --surface surface:2 --lines 200 --interrupt
```

In the target surface, run:

```bash
node -e 'setTimeout(() => { console.log("OPENAI_API_KEY=sk-1234567890abcdefghijklmnop"); setInterval(() => console.log("still running"), 500); }, 1000)'
```

The watcher reads the target surface, scans the visible screen plus recent scrollback, records a block report, and sends `ctrl+c` to the same surface. This is an operator safety interrupt for screen-visible risk; it does not undo network payloads that may already have left the machine.

## cmux Integration Points

404gent currently uses:

- `cmux notify --title "..." --body "..."`
- `cmux set-status 404gent "..." --icon shield --color "..."`
- `cmux set-progress ... --label "..."`
- `cmux log --level warning|error --source ... "..."`
- `cmux read-screen --surface ... --scrollback --lines ...`
- `cmux send-key --surface ... ctrl+c`

These are intentionally small integration points because they work with any terminal agent that can call a shell command.

Official references:

- [cmux notifications](https://www.cmux.dev/docs/notifications)
- [cmux API reference](https://www.cmux.dev/docs/api)

## Expected Demo Beat

1. Start in a cmux terminal.
2. Run `npm run demo:cmux`.
3. Point out the notification when the demo starts.
4. Point out `doctor` and `rules summary` first: the guard knows its policy and environment.
5. Point out `BLOCK`, `WARN`, and `ALLOW` decisions.
6. Point out sidebar progress while a guarded command or agent is running.
7. Point out that warn/block events are appended to the cmux sidebar log, not only printed in the terminal.
8. Point out that the DB URL is redacted before terminal output leaves the guard.
9. End on `audit summary`: the guard leaves a reviewable trail.
