import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  formatTower,
  formatStatus,
  readState,
  resetState,
  updateStateFromReport
} from "../src/state.js";

test("updates sticky contaminated state for an agent", () => {
  const config = testConfig();

  updateStateFromReport({
    decision: "block",
    event: {
      type: "prompt",
      source: "agent:codex:prompt"
    },
    findings: [
      {
        id: "prompt.ignore-instructions",
        severity: "high",
        category: "prompt_injection",
        rationale: "Prompt attempted to override instructions."
      }
    ]
  }, config);

  updateStateFromReport({
    decision: "allow",
    event: {
      type: "command",
      source: "agent:codex:launch"
    },
    findings: []
  }, config);

  const state = readState(config);
  assert.equal(state.targets["agent:codex"].status, "contaminated");
  assert.equal(state.targets["agent:codex"].currentStatus, "clean");
  assert.match(formatStatus(state, { targetId: "agent:codex" }), /CONTAMINATED/);
});

test("resets status state", () => {
  const config = testConfig();

  updateStateFromReport({
    decision: "warn",
    event: {
      type: "command",
      source: "agent:gemini:launch"
    },
    findings: [
      {
        id: "command.network-scan",
        severity: "medium",
        category: "reconnaissance",
        rationale: "Scanner detected."
      }
    ]
  }, config);

  resetState(config, { targetId: "agent:gemini" });
  const state = readState(config);
  assert.equal(state.targets["agent:gemini"], undefined);
});

test("updates agent state from simulated OS events", () => {
  const config = testConfig();

  updateStateFromReport({
    decision: "block",
    event: {
      type: "os",
      source: "agent:os-demo:os"
    },
    findings: [
      {
        id: "os.sensitive-file-open",
        severity: "high",
        category: "secret_discovery",
        rationale: "OS Guard observed a process opening a credential file."
      }
    ]
  }, config);

  const state = readState(config);
  assert.equal(state.targets["agent:os-demo"].status, "danger");
  assert.equal(state.targets["agent:os-demo"].lastEventType, "os");
});

test("formats control tower with recommended actions", () => {
  const config = testConfig();

  updateStateFromReport({
    decision: "block",
    event: {
      type: "prompt",
      source: "agent:prompt-agent:prompt"
    },
    findings: [
      {
        id: "prompt.ignore-instructions-ko",
        severity: "high",
        category: "prompt_injection",
        rationale: "Korean prompt appears to override higher-priority instructions."
      }
    ]
  }, config);

  updateStateFromReport({
    decision: "allow",
    event: {
      type: "command",
      source: "agent:safe-agent:launch"
    },
    findings: []
  }, config);

  const output = formatTower(readState(config), {
    now: new Date("2026-04-25T00:00:00.000Z")
  });

  assert.match(output, /404gent Control Tower/);
  assert.match(output, /Workspace posture: .*CONTAMINATED/);
  assert.match(output, /agent:prompt-agent/);
  assert.match(output, /agent:safe-agent/);
  assert.match(output, /Recommended actions:/);
  assert.match(output, /Review contaminated targets/);
});

function testConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "404gent-state-"));
  return {
    cmux: {
      status: false
    },
    state: {
      enabled: true,
      path: path.join(dir, "state.json")
    }
  };
}
