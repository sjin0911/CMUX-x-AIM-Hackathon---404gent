import fs from "node:fs";
import path from "node:path";

export function readAuditEvents(config = {}, { limit } = {}) {
  const logPath = getAuditPath(config);
  if (!fs.existsSync(logPath)) {
    return [];
  }

  const lines = fs.readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

  const selected = Number.isInteger(limit) && limit > 0 ? lines.slice(-limit) : lines;
  const events = [];

  for (const line of selected) {
    try {
      events.push(JSON.parse(line));
    } catch {
      events.push({
        timestamp: null,
        decision: "invalid",
        event: { type: "unknown", source: "audit" },
        findings: [],
        parseError: true
      });
    }
  }

  return events;
}

export function summarizeAuditEvents(events) {
  const summary = {
    total: events.length,
    decisions: {},
    eventTypes: {},
    severities: {},
    categories: {},
    topRules: {}
  };

  for (const event of events) {
    bump(summary.decisions, event.decision ?? "unknown");
    bump(summary.eventTypes, event.event?.type ?? "unknown");

    for (const finding of event.findings ?? []) {
      bump(summary.severities, finding.severity ?? "unknown");
      bump(summary.categories, finding.category ?? "unknown");
      bump(summary.topRules, finding.id ?? "unknown");
    }
  }

  return summary;
}

export function formatAuditSummary(summary) {
  return [
    `Audit events: ${summary.total}`,
    `Decisions: ${formatCounts(summary.decisions)}`,
    `Event types: ${formatCounts(summary.eventTypes)}`,
    `Severities: ${formatCounts(summary.severities)}`,
    `Categories: ${formatCounts(summary.categories)}`,
    `Top rules: ${formatCounts(summary.topRules, 8)}`
  ].join("\n");
}

export function formatAuditTail(events) {
  if (events.length === 0) {
    return "No audit events.";
  }

  return events.map((event) => {
    const topFinding = event.findings?.[0];
    const findingText = topFinding
      ? `${topFinding.severity}/${topFinding.id}`
      : "no findings";
    return [
      event.timestamp ?? "<no timestamp>",
      event.decision?.toUpperCase() ?? "UNKNOWN",
      event.event?.type ?? "unknown",
      event.event?.source ?? "unknown",
      findingText
    ].join(" | ");
  }).join("\n");
}

export function getAuditPath(config = {}) {
  return path.resolve(process.cwd(), config.logging?.path ?? ".404gent/events.jsonl");
}

export function resetAuditLog(config = {}) {
  const logPath = getAuditPath(config);
  if (fs.existsSync(logPath)) {
    fs.rmSync(logPath);
  }

  return { path: logPath, reset: true };
}

function bump(target, key) {
  target[key] = (target[key] ?? 0) + 1;
}

function formatCounts(counts, limit = 10) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (entries.length === 0) {
    return "none";
  }

  return entries.map(([key, value]) => `${key}=${value}`).join(", ");
}
