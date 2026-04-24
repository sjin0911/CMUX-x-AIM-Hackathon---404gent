import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
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

