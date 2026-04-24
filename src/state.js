import fs from "node:fs";
import path from "node:path";
import { severityRank } from "./policy/severity.js";
import { getCmuxContext, setCmuxStatus } from "./integrations/cmux.js";

const STATUS_RANK = {
  clean: 0,
  warning: 1,
  danger: 2,
  contaminated: 3
};

const STATUS_STYLE = {
  clean: { label: "clean", icon: "shield-check", color: "#34c759" },
  warning: { label: "warning", icon: "shield", color: "#ff9500" },
  danger: { label: "danger", icon: "shield-alert", color: "#ff3b30" },
  contaminated: { label: "contaminated", icon: "shield-x", color: "#bf5af2" }
};

const CONTAMINATION_CATEGORIES = new Set([
  "prompt_injection",
  "guardrail_tampering",
  "secret_exfiltration",
  "secret_leak",
  "remote_code_execution",
  "backdoor_or_poisoning",
  "malware_or_abuse"
]);

const lastCmuxSyncByTarget = new Map();

export function updateStateFromReport(report, config = {}) {
  if (config.state?.enabled === false) {
    return null;
  }

  const state = readState(config);
  const target = resolveTarget(report);
  const current = state.targets[target.id] ?? createTargetState(target);
  const eventStatus = statusFromReport(report);
  const now = new Date().toISOString();
  const topFinding = report.findings?.[0] ?? null;

  current.kind = target.kind;
  current.name = target.name;
  current.source = report.event?.source ?? current.source;
  current.status = higherStatus(current.status ?? "clean", eventStatus);
  current.currentStatus = eventStatus;
  current.lastDecision = report.decision;
  current.lastEventType = report.event?.type ?? "unknown";
  current.lastFinding = topFinding ? {
    id: topFinding.id,
    severity: topFinding.severity,
    category: topFinding.category,
    rationale: topFinding.rationale
  } : null;
  current.updatedAt = now;
  current.counts ??= { allow: 0, warn: 0, block: 0 };
  current.counts[report.decision] = (current.counts[report.decision] ?? 0) + 1;
  current.findingCounts ??= {};

  for (const finding of report.findings ?? []) {
    current.findingCounts[finding.category] = (current.findingCounts[finding.category] ?? 0) + 1;
  }

  state.targets[target.id] = current;
  state.updatedAt = now;
  writeState(state, config);
  syncTargetToCmux(current, config);
  return current;
}

export function readState(config = {}) {
  const statePath = getStatePath(config);
  if (!fs.existsSync(statePath)) {
    return emptyState();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? null,
      targets: parsed.targets ?? {}
    };
  } catch {
    return emptyState();
  }
}

export function writeState(state, config = {}) {
  const statePath = getStatePath(config);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function resetState(config = {}, { targetId } = {}) {
  const state = readState(config);
  if (targetId) {
    delete state.targets[targetId];
  } else {
    state.targets = {};
  }

  state.updatedAt = new Date().toISOString();
  writeState(state, config);
  return state;
}

export function formatStatus(state, { targetId } = {}) {
  const targets = selectTargets(state, targetId);
  if (targets.length === 0) {
    return "No 404gent status yet.";
  }

  return targets.map((target) => {
    const finding = target.lastFinding
      ? `${target.lastFinding.severity}/${target.lastFinding.category}/${target.lastFinding.id}`
      : "no findings";
    return [
      `${target.id}: ${target.status.toUpperCase()}`,
      `current=${target.currentStatus}`,
      `decision=${target.lastDecision}`,
      `event=${target.lastEventType}`,
      `counts=${formatCounts(target.counts ?? {})}`,
      `last=${finding}`
    ].join(" | ");
  }).join("\n");
}

export function syncStateToCmux(state, config = {}) {
  const results = [];
  for (const target of Object.values(state.targets ?? {})) {
    results.push(syncTargetToCmux(target, config, { force: true }));
  }
  return results;
}

export function resolveTargetId({ agent } = {}) {
  if (agent) {
    return `agent:${agent}`;
  }

  const context = getCmuxContext();
  if (context.surfaceId) {
    return `surface:${context.surfaceId}`;
  }

  if (context.workspaceId) {
    return `workspace:${context.workspaceId}`;
  }

  return "local";
}

export function getStatePath(config = {}) {
  return path.resolve(process.cwd(), config.state?.path ?? ".404gent/state.json");
}

function statusFromReport(report) {
  if (isContamination(report)) {
    return "contaminated";
  }

  if (report.decision === "block") {
    return "danger";
  }

  if (report.decision === "warn") {
    return "warning";
  }

  return "clean";
}

function isContamination(report) {
  return (report.findings ?? []).some((finding) => {
    if (!CONTAMINATION_CATEGORIES.has(finding.category)) {
      return false;
    }

    return severityRank[finding.severity] >= severityRank.high;
  });
}

function higherStatus(current, next) {
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

function resolveTarget(report) {
  const source = report.event?.source ?? "";
  const agentMatch = /^agent:([^:]+):/.exec(source);
  if (agentMatch) {
    return {
      id: `agent:${agentMatch[1]}`,
      kind: "agent",
      name: agentMatch[1]
    };
  }

  const context = getCmuxContext();
  if (context.surfaceId) {
    return {
      id: `surface:${context.surfaceId}`,
      kind: "surface",
      name: context.surfaceId
    };
  }

  if (context.workspaceId) {
    return {
      id: `workspace:${context.workspaceId}`,
      kind: "workspace",
      name: context.workspaceId
    };
  }

  return {
    id: "local",
    kind: "local",
    name: "local"
  };
}

function createTargetState(target) {
  return {
    id: target.id,
    kind: target.kind,
    name: target.name,
    status: "clean",
    currentStatus: "clean",
    lastDecision: "allow",
    lastEventType: "unknown",
    lastFinding: null,
    counts: { allow: 0, warn: 0, block: 0 },
    findingCounts: {},
    updatedAt: null
  };
}

function emptyState() {
  return {
    version: 1,
    updatedAt: null,
    targets: {}
  };
}

function selectTargets(state, targetId) {
  if (targetId) {
    return state.targets?.[targetId] ? [state.targets[targetId]] : [];
  }

  return Object.values(state.targets ?? {}).sort((a, b) => {
    return STATUS_RANK[b.status] - STATUS_RANK[a.status]
      || String(a.id).localeCompare(String(b.id));
  });
}

function syncTargetToCmux(target, config, { force = false } = {}) {
  const style = STATUS_STYLE[target.status] ?? STATUS_STYLE.clean;
  const value = target.lastFinding
    ? `${style.label}: ${target.lastFinding.category}`
    : style.label;
  const key = `404gent:${target.id}`;
  const signature = `${target.status}:${value}`;
  const throttleMs = config.performance?.cmuxStatusThrottleMs ?? 1000;
  const previous = lastCmuxSyncByTarget.get(key);
  const now = Date.now();

  if (!force && previous?.signature === signature && now - previous.timestamp < throttleMs) {
    return { status: "throttled", key };
  }

  lastCmuxSyncByTarget.set(key, { signature, timestamp: now });

  return setCmuxStatus(key, value, {
    icon: style.icon,
    color: style.color
  }, config);
}

function formatCounts(counts) {
  return Object.entries(counts)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}
