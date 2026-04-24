import test from "node:test";
import assert from "node:assert/strict";
import {
  formatAuditSummary,
  formatAuditTail,
  summarizeAuditEvents
} from "../src/audit.js";

test("summarizes audit events", () => {
  const summary = summarizeAuditEvents([
    {
      decision: "block",
      event: { type: "command", source: "scan-command" },
      findings: [
        {
          id: "command.reverse-shell",
          severity: "critical",
          category: "remote_code_execution"
        }
      ]
    },
    {
      decision: "warn",
      event: { type: "command", source: "scan-command" },
      findings: [
        {
          id: "command.network-scan",
          severity: "medium",
          category: "reconnaissance"
        }
      ]
    }
  ]);

  assert.equal(summary.total, 2);
  assert.equal(summary.decisions.block, 1);
  assert.equal(summary.eventTypes.command, 2);
  assert.equal(summary.categories.remote_code_execution, 1);
  assert.match(formatAuditSummary(summary), /Audit events: 2/);
});

test("formats audit tail", () => {
  const output = formatAuditTail([
    {
      timestamp: "2026-04-25T00:00:00.000Z",
      decision: "block",
      event: { type: "prompt", source: "scan-prompt" },
      findings: [{ id: "prompt.ignore-instructions", severity: "high" }]
    }
  ]);

  assert.match(output, /BLOCK/);
  assert.match(output, /prompt.ignore-instructions/);
});

