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
