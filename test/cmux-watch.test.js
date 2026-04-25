import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildReadScreenArgs,
  buildSendKeyArgs
} from "../src/integrations/cmux.js";
import {
  createInterruptLimiter,
  createScreenEvent,
  shouldProcessScreen
} from "../src/cmux-watch.js";

test("builds cmux read-screen args with target and scrollback lines", () => {
  assert.deepEqual(
    buildReadScreenArgs({
      workspace: "workspace:1",
      surface: "surface:2",
      lines: 200
    }),
    ["read-screen", "--workspace", "workspace:1", "--surface", "surface:2", "--scrollback", "--lines", "200"]
  );
});

test("builds cmux send-key args with target surface", () => {
  assert.deepEqual(
    buildSendKeyArgs("ctrl+c", { surface: "surface:2" }),
    ["send-key", "--surface", "surface:2", "ctrl+c"]
  );
});

test("creates output events from cmux screen text", () => {
  const event = createScreenEvent("OPENAI_API_KEY=sk-1234567890abcdefghijklmnop", {
    agent: "demo",
    workspace: "workspace:1",
    surface: "surface:2",
    maxChars: 12000
  });

  assert.equal(event.type, "output");
  assert.equal(event.source, "agent:demo:cmux-screen");
  assert.equal(event.meta.cmuxScreen, true);
  assert.equal(event.meta.surface, "surface:2");
});

test("skips duplicate cmux screen hashes", () => {
  const first = shouldProcessScreen("same screen", null);
  const second = shouldProcessScreen("same screen", first.hash);

  assert.equal(first.process, true);
  assert.equal(second.process, false);
  assert.equal(second.reason, "duplicate");
});

test("rate limits repeated cmux interrupts", () => {
  let current = 1000;
  const limiter = createInterruptLimiter({
    maxInterrupts: 2,
    windowMs: 60000,
    now: () => current
  });

  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), true);
  assert.equal(limiter.allow(), false);

  current += 60000;
  assert.equal(limiter.allow(), true);
});

test("cmux-watch --once scans screen text as output", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "404gent-cmux-watch-"));
  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir);
  const cmuxPath = path.join(binDir, "cmux");
  fs.writeFileSync(
    cmuxPath,
    [
      "#!/usr/bin/env bash",
      "if [ \"$1\" = \"read-screen\" ]; then",
      "  printf '%s\\n' 'OPENAI_API_KEY=sk-1234567890abcdefghijklmnop'",
      "  exit 0",
      "fi",
      "exit 0"
    ].join("\n"),
    "utf8"
  );
  fs.chmodSync(cmuxPath, 0o755);

  const configPath = path.join(dir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify({
    cmux: {
      notify: false,
      status: false,
      log: false,
      quarantinePane: false
    },
    logging: {
      enabled: false
    },
    state: {
      enabled: false
    }
  }), "utf8");

  const result = spawnSync(
    process.execPath,
    ["src/cli.js", "--config", configPath, "cmux-watch", "--once"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`
      }
    }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /404gent BLOCK \(output\)/);
  assert.match(result.stdout, /REDACTED_SECRET/);
});
