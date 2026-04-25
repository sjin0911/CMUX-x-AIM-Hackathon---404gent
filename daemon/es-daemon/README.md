# 404gent ES Daemon

Swift skeleton for a future macOS EndpointSecurity daemon.

## Current State

Skeleton mode only. This package does not create an EndpointSecurity client, does not subscribe to `AUTH_OPEN` or `AUTH_EXEC`, and does not block real OS events.

## Build

```bash
swift build
```

If SwiftPM fails while compiling `Package.swift` or Foundation modules, reinstall or switch to a matching Xcode/Command Line Tools toolchain with `xcode-select`. EndpointSecurity work should be built with a complete, matching Apple toolchain because later phases require entitlements and signing.

## Run

```bash
.build/debug/es-daemon
```

Expected output:

```text
404gent ES Daemon starting...
Mode: skeleton (no real ES hooks)
Policy bridge: http://127.0.0.1:7404
Ready. Press Ctrl+C to stop.
```

## Intended Integration

The daemon will eventually observe EndpointSecurity file/process events and ask the 404gent policy layer for decisions over localhost HTTP.

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
2. Next: local 404gent HTTP policy endpoint.
3. Next: EndpointSecurity notify-mode observation.
4. Later: `AUTH_OPEN` and `AUTH_EXEC` denial with entitlement, signing, and privileged execution.
