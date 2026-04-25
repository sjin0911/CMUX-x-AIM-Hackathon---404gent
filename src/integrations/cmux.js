import { spawnSync } from "node:child_process";

export function isCmuxAvailable() {
  const result = spawnSync("sh", ["-lc", "command -v cmux"], {
    encoding: "utf8"
  });

  return result.status === 0;
}

export function getCmuxContext() {
  return {
    workspaceId: process.env.CMUX_WORKSPACE_ID || null,
    surfaceId: process.env.CMUX_SURFACE_ID || null,
    socketPath: process.env.CMUX_SOCKET_PATH || "/tmp/cmux.sock",
    insideCmux: Boolean(process.env.CMUX_WORKSPACE_ID && process.env.CMUX_SURFACE_ID)
  };
}

export function notifyCmux(report, config = {}) {
  if (!config.cmux?.notify || report.decision === "allow") {
    return { status: "skipped" };
  }

  const title = report.decision === "block"
    ? "404gent blocked an agent action"
    : "404gent warning";
  const topFinding = report.findings[0];
  const body = topFinding
    ? `${topFinding.severity.toUpperCase()} ${topFinding.category}: ${topFinding.rationale}`
    : `Decision: ${report.decision}`;

  const result = spawnSync("cmux", ["notify", "--title", title, "--body", body], {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

export function setCmuxStatus(key, value, { icon = "shield", color = "#34c759" } = {}, config = {}) {
  if (config.cmux?.status === false) {
    return { status: "skipped" };
  }

  const result = spawnSync("cmux", [
    "set-status",
    key,
    value,
    "--icon",
    icon,
    "--color",
    color
  ], {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

export function setCmuxProgress(value, label = "", config = {}) {
  if (config.cmux?.progress === false) {
    return { status: "skipped" };
  }

  const args = ["set-progress", String(value)];
  if (label) {
    args.push("--label", label);
  }

  const result = spawnSync("cmux", args, {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

export function clearCmuxProgress(config = {}) {
  if (config.cmux?.progress === false) {
    return { status: "skipped" };
  }

  const result = spawnSync("cmux", ["clear-progress"], {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

export function logCmux(message, { level = "info", source = "404gent" } = {}, config = {}) {
  if (config.cmux?.log === false) {
    return { status: "skipped" };
  }

  const result = spawnSync("cmux", [
    "log",
    "--level",
    level,
    "--source",
    source,
    message
  ], {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

export function logCmuxReport(report, config = {}) {
  if (report.decision === "allow") {
    return { status: "skipped" };
  }

  const topFinding = report.findings[0];
  const level = report.decision === "block" ? "error" : "warning";
  const source = report.event?.source || "404gent";
  const message = topFinding
    ? `${report.decision.toUpperCase()} ${report.event?.type || "event"} ${topFinding.id}: ${topFinding.rationale}`
    : `${report.decision.toUpperCase()} ${report.event?.type || "event"}`;

  return logCmux(message, { level, source }, config);
}

export function openCmuxQuarantinePane(report, config = {}, { diagnosis } = {}) {
  if (!config.cmux?.quarantinePane || report.decision !== "block") {
    return { status: "skipped" };
  }

  const split = spawnSync("cmux", ["new-split", "right"], {
    stdio: "ignore"
  });

  if (split.error) {
    return { status: "unavailable", error: split.error.message };
  }

  if (split.status !== 0) {
    return { status: "error", code: split.status };
  }

  const topFinding = report.findings[0];
  const text = [
    "404gent QUARANTINE REVIEW",
    "",
    `decision: ${report.decision.toUpperCase()}`,
    `event: ${report.event?.type || "unknown"}`,
    `source: ${report.event?.source || "unknown"}`,
    topFinding ? `rule: ${topFinding.id}` : "rule: none",
    topFinding ? `severity: ${topFinding.severity}` : "severity: none",
    topFinding ? `category: ${topFinding.category}` : "category: none",
    "",
    "The original action was blocked and was not executed.",
    "Review this pane, the audit log, and the originating agent before retrying.",
    "",
    ...(diagnosis ? formatQuarantineDiagnosis(diagnosis) : []),
    "",
    "blocked text:",
    truncate(report.event?.text || "", 2000)
  ].join("\n");

  const command = `clear\nprintf '%s\\n' ${shellQuote(text)}\n`;
  const send = spawnSync("cmux", ["send", command], {
    stdio: "ignore"
  });

  if (send.error) {
    return { status: "unavailable", error: send.error.message };
  }

  logCmux("Opened quarantine pane for blocked action", {
    level: "error",
    source: report.event?.source || "404gent"
  }, config);

  return { status: send.status === 0 ? "ok" : "error", code: send.status };
}

export function clearCmuxStatus(key, config = {}) {
  if (config.cmux?.status === false) {
    return { status: "skipped" };
  }

  const result = spawnSync("cmux", ["clear-status", key], {
    stdio: "ignore"
  });

  if (result.error) {
    return { status: "unavailable", error: result.error.message };
  }

  return { status: result.status === 0 ? "ok" : "error", code: result.status };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\"'\"'")}'`;
}

function truncate(value, maxChars) {
  const text = String(value);
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function formatQuarantineDiagnosis(diagnosis) {
  const lines = [
    "contamination diagnosis:",
    `target: ${diagnosis.target}`,
    `status: ${String(diagnosis.status).toUpperCase()}`,
    `root cause: ${diagnosis.rootCause}`,
    "",
    "timeline:"
  ];

  for (const step of diagnosis.timeline.slice(-6)) {
    const finding = step.finding
      ? `${step.finding.severity}/${step.finding.category}/${step.finding.id}`
      : "no findings";
    lines.push(`- [${step.index}] ${step.eventType} ${String(step.decision).toUpperCase()} ${finding}`);
  }

  lines.push("");
  lines.push("graph:");
  for (const edge of diagnosis.graph.slice(-6)) {
    lines.push(edge);
  }

  lines.push("");
  lines.push("sanitize & resume playbook:");
  for (const action of diagnosis.playbook.slice(0, 5)) {
    lines.push(`- ${action}`);
  }

  return lines;
}
