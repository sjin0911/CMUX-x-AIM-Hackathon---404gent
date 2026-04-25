import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getAuditPath } from "./audit.js";
import { getOsGuardStatus } from "./integrations/os-guard.js";
import { getRules, summarizeRules } from "./policy/rules.js";
import { getStatePath } from "./state.js";

export function runDoctor(config = {}) {
  const checks = [];

  checks.push(checkNode());
  checks.push(checkRules(config));
  checks.push(checkAuditPath(config));
  checks.push(checkStatePath(config));
  checks.push(checkOsGuard(config));
  checks.push(checkCmux());
  checks.push(checkGemini(config));

  return checks;
}

export function formatDoctor(checks) {
  const status = checks.some((check) => check.status === "fail")
    ? "FAIL"
    : checks.some((check) => check.status === "warn")
      ? "WARN"
      : "OK";

  const lines = [`404gent doctor: ${status}`];
  for (const check of checks) {
    lines.push(`- [${check.status}] ${check.name}: ${check.message}`);
  }

  return lines.join("\n");
}

function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) {
    return ok("node", `Node ${process.versions.node}`);
  }

  return fail("node", `Node ${process.versions.node}; Node 20+ is required`);
}

function checkRules(config) {
  try {
    const rules = getRules(config);
    const summary = summarizeRules(rules);
    return ok("rules", `${summary.total} rules loaded`);
  } catch (error) {
    return fail("rules", error.message);
  }
}

function checkAuditPath(config) {
  const auditPath = getAuditPath(config);
  const dir = path.dirname(auditPath);

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return ok("audit", `writable at ${auditPath}`);
  } catch (error) {
    return fail("audit", `not writable at ${auditPath}: ${error.message}`);
  }
}

function checkStatePath(config) {
  const statePath = getStatePath(config);
  const dir = path.dirname(statePath);

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return ok("state", `writable at ${statePath}`);
  } catch (error) {
    return fail("state", `not writable at ${statePath}: ${error.message}`);
  }
}

function checkCmux() {
  const result = spawnSync("sh", ["-lc", "command -v cmux"], { encoding: "utf8" });
  if (result.status === 0) {
    return ok("cmux", result.stdout.trim());
  }

  return warn("cmux", "cmux command not found; CLI still works without notifications");
}

function checkOsGuard(config) {
  const status = getOsGuardStatus(config);

  if (!status.enabled) {
    return warn("os-guard", "disabled");
  }

  if (status.mode === "simulate") {
    return warn("os-guard", "simulate mode; native EndpointSecurity not connected");
  }

  return warn("os-guard", `${status.mode} mode; native EndpointSecurity not connected`);
}

function checkGemini(config) {
  if (!config.llm?.enabled) {
    return warn("gemini", "LLM review disabled");
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return ok("gemini", `${config.llm.provider ?? "gemini"} enabled with API key present`);
  }

  return fail("gemini", "LLM review enabled but GEMINI_API_KEY/GOOGLE_API_KEY is missing");
}

function ok(name, message) {
  return { status: "ok", name, message };
}

function warn(name, message) {
  return { status: "warn", name, message };
}

function fail(name, message) {
  return { status: "fail", name, message };
}
