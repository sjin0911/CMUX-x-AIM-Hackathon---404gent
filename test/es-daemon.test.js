import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRegisterPidRequest,
  getDaemonEndpoint
} from "../src/integrations/es-daemon.js";

test("builds daemon control PID registration payload", () => {
  assert.deepEqual(buildRegisterPidRequest({
    pid: "1234",
    agent: "codex"
  }), {
    pid: 1234,
    agent: "codex"
  });
});

test("rejects invalid daemon control PID registration payloads", () => {
  assert.throws(() => buildRegisterPidRequest({ pid: 0 }), /positive integer/);
  assert.throws(() => buildRegisterPidRequest({ pid: "abc" }), /positive integer/);
});

test("resolves daemon control endpoint from config", () => {
  assert.equal(getDaemonEndpoint({
    osGuard: {
      daemonEndpoint: "http://127.0.0.1:9999"
    }
  }), "http://127.0.0.1:9999");
});
