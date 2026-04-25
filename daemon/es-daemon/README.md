# 404gent ES Daemon

Swift macOS EndpointSecurity daemon for 404gent OS Guard NOTIFY mode.

## Current State

The daemon subscribes to `NOTIFY_OPEN` and `NOTIFY_EXEC`, filters watched PIDs, and posts observed events to the local 404gent policy server. It does not subscribe to `AUTH_OPEN` or `AUTH_EXEC`, and it does not block real OS events.

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
sudo FOURGENT_WATCH_PIDS=1234 .build/debug/es-daemon
```

Expected output:

```text
404gent ES Daemon starting...
Mode: EndpointSecurity NOTIFY
Policy bridge: http://127.0.0.1:7404
Ready. Press Ctrl+C to stop.
```

Start the Node policy server first from the repo root:

```bash
node src/cli.js server
```

Environment variables:

- `FOURGENT_POLICY_ENDPOINT`: policy server base URL, default `http://127.0.0.1:7404`
- `FOURGENT_WATCH_PIDS`: comma-separated PID allowlist, for example `1234,5678`

## Intended Integration

The daemon observes EndpointSecurity file/process events and asks the 404gent policy layer for decisions over localhost HTTP.

```text
POST http://127.0.0.1:7404/os-event
{
  "type": "open",
  "path": ".env",
  "pid": 1234
}
```

The policy service should respond with a decision such as:

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
4. Later: `AUTH_OPEN` and `AUTH_EXEC` denial with entitlement, signing, and privileged execution.
