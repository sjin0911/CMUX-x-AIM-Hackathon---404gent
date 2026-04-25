import path from "node:path";

export function getOsGuardStatus(config = {}) {
  const osGuard = config.osGuard ?? {};
  const mode = osGuard.mode ?? "simulate";
  return {
    enabled: osGuard.enabled !== false,
    mode,
    nativeConnected: false,
    message: mode === "simulate"
      ? "OS Guard simulate mode; native EndpointSecurity is not connected."
      : `OS Guard mode=${mode}; native EndpointSecurity is not connected.`
  };
}

export function createOpenEvent(filePath, { agent, pid, config } = {}) {
  const meta = {
    operation: "open",
    path: filePath,
    normalizedPath: normalizePath(filePath),
    agent: agent ?? null,
    pid: normalizePid(pid),
    mode: config?.osGuard?.mode ?? "simulate"
  };

  return {
    type: "os",
    text: formatOsEventText(meta),
    source: sourceForAgent(agent),
    meta
  };
}

export function createExecEvent(argv, { agent, pid, config } = {}) {
  const args = Array.isArray(argv) ? argv : [String(argv ?? "")];
  const meta = {
    operation: "exec",
    argv: args,
    executable: args[0] ?? "",
    agent: agent ?? null,
    pid: normalizePid(pid),
    mode: config?.osGuard?.mode ?? "simulate"
  };

  return {
    type: "os",
    text: formatOsEventText(meta),
    source: sourceForAgent(agent),
    meta
  };
}

export function formatOsGuardStatus(status) {
  const enabled = status.enabled ? "enabled" : "disabled";
  const native = status.nativeConnected ? "connected" : "not connected";
  return `OS Guard: ${enabled}, mode=${status.mode}, native=${native}\n${status.message}`;
}

export function formatOsEventText(meta) {
  const pid = meta.pid ? ` pid=${meta.pid}` : "";
  const agent = meta.agent ? ` agent=${shellToken(meta.agent)}` : "";
  const mode = meta.mode ? ` mode=${shellToken(meta.mode)}` : "";

  if (meta.operation === "open") {
    return `os open path=${shellToken(meta.path)}${pid}${agent}${mode}`;
  }

  if (meta.operation === "exec") {
    return `os exec argv=${shellToken((meta.argv ?? []).join(" "))}${pid}${agent}${mode}`;
  }

  return `os ${shellToken(meta.operation ?? "unknown")}${pid}${agent}${mode}`;
}

function sourceForAgent(agent) {
  return agent ? `agent:${agent}:os` : "os-guard";
}

function normalizePath(filePath) {
  if (!filePath) {
    return "";
  }

  return path.normalize(String(filePath));
}

function normalizePid(pid) {
  if (pid === undefined || pid === null || pid === "") {
    return null;
  }

  const value = Number(pid);
  return Number.isInteger(value) && value > 0 ? value : String(pid);
}

function shellToken(value) {
  const text = String(value ?? "");
  if (/^[A-Za-z0-9_./:@=-]+$/.test(text)) {
    return text;
  }

  return `"${text.replace(/["\\]/g, "\\$&")}"`;
}
