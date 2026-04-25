# 404gent ES Daemon

Swift macOS EndpointSecurity daemon for 404gent OS Guard native mode.

## Current State

The daemon subscribes to `AUTH_OPEN` and `NOTIFY_EXEC`, filters watched PIDs, and posts events to the local 404gent policy server. `AUTH_OPEN` decisions are made locally in Swift so sensitive file opens can be denied before Node audit/cmux reporting. It does not subscribe to `AUTH_EXEC`.

## Build

```bash
swift build
```

If `xcode-select` still points at Command Line Tools while full Xcode is installed, build with an explicit developer directory:

```bash
DEVELOPER_DIR=/Applications/Xcode-16.2.0.app/Contents/Developer swift build
DEVELOPER_DIR=/Applications/Xcode-16.2.0.app/Contents/Developer swift test
```

If SwiftPM fails while compiling `Package.swift` or Foundation modules, reinstall or switch to a matching Xcode/Command Line Tools toolchain with `xcode-select`. EndpointSecurity work should be built with a complete, matching Apple toolchain because later phases require entitlements and signing.

## Run

```bash
./scripts/sign.sh
sudo FOURGENT_WATCH_PIDS=1234 .build/debug/es-daemon
```

Expected output:

```text
404gent ES Daemon starting...
Mode: EndpointSecurity AUTH_OPEN + NOTIFY_EXEC
Policy bridge: http://127.0.0.1:7404
Daemon control: http://127.0.0.1:7405
Ready. Press Ctrl+C to stop.
```

Start the Node policy server first from the repo root:

```bash
node src/cli.js server
```

Environment variables:

- `FOURGENT_POLICY_ENDPOINT`: policy server base URL, default `http://127.0.0.1:7404`
- `FOURGENT_CONTROL_HOST`: daemon control bind host, default `127.0.0.1`
- `FOURGENT_CONTROL_PORT`: daemon control bind port, default `7405`
- `FOURGENT_WATCH_PIDS`: comma-separated PID allowlist, for example `1234,5678`
- `FOURGENT_WATCH_ALL`: test-only full-system watch mode; default `false`

For smoke tests only:

```bash
sudo FOURGENT_WATCH_ALL=true .build/debug/es-daemon
```

Use `FOURGENT_WATCH_PIDS` for normal demo runs. `FOURGENT_WATCH_ALL=true` is intentionally opt-in because `AUTH_OPEN` runs on hot system paths.

## Intended Integration

The daemon denies or allows `AUTH_OPEN` locally, then posts best-effort audit events to 404gent over localhost HTTP. `NOTIFY_EXEC` is observation-only.

Port split:

```text
7404: Node policy server, receives OS event reports with POST /os-event
7405: Swift daemon control server, receives PID registrations
```

Daemon control endpoints:

```text
POST http://127.0.0.1:7405/register-pid
GET  http://127.0.0.1:7405/status
```

`404gent agent --with-os-guard -- ...` registers its spawned child PID automatically. The CLI can also register already-running agents:

```bash
node src/cli.js os-guard register-existing --names codex,claude,gemini,opencode
```

```text
POST http://127.0.0.1:7404/os-event
{
  "type": "open",
  "path": ".env",
  "pid": 1234,
  "authDecision": "deny",
  "reason": "sensitive file: .env",
  "cache": false
}
```

The policy service responds with a reporting decision such as:

```json
{
  "decision": "block",
  "reason": "sensitive file"
}
```

## Roadmap

1. Done: directory structure and buildable skeleton.
2. Done: local 404gent HTTP policy endpoint.
3. Done: EndpointSecurity notify-mode observation.
4. Done: `AUTH_OPEN` sensitive-file denial with ad-hoc signing support.
5. Done: daemon control server and runtime PID registration.
6. Later: `AUTH_EXEC` denial, production signing, packaging, and privileged deployment.
