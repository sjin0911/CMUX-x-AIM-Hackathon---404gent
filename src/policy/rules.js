import fs from "node:fs";
import path from "node:path";
import { defaultRules } from "./default-rules.js";
import { severityRank } from "./severity.js";

const VALID_EVENT_TYPES = new Set(["prompt", "command", "output"]);
const ruleCache = new WeakMap();

export function getRules(config = {}) {
  if (config && typeof config === "object" && ruleCache.has(config)) {
    return ruleCache.get(config);
  }

  const rules = resolveRules(config);
  validateRules(rules);

  if (config && typeof config === "object") {
    ruleCache.set(config, rules);
  }

  return rules;
}

export function resolveRules(config = {}) {
  const rulesConfig = config.rules ?? {};
  const resolved = [
    ...defaultRules.map((rule) => ({ ...rule, source: "default" })),
    ...loadRulePaths(rulesConfig.paths ?? []).map((rule) => ({ ...rule, source: rule.source ?? "file" })),
    ...(rulesConfig.custom ?? []).map((rule) => ({ ...rule, source: "config" }))
  ];

  const overrides = new Map((rulesConfig.overrides ?? []).map((override) => [override.id, override]));

  return resolved.map((rule) => {
    const override = overrides.get(rule.id);
    return override ? { ...rule, ...override, id: rule.id } : rule;
  });
}

export function validateRules(rules) {
  if (!Array.isArray(rules)) {
    throw new TypeError("Rules must be an array.");
  }

  const ids = new Set();
  for (const rule of rules) {
    validateRule(rule);
    if (ids.has(rule.id)) {
      throw new Error(`Duplicate rule id: ${rule.id}`);
    }
    ids.add(rule.id);
  }

  return true;
}

export function summarizeRules(rules) {
  const summary = {
    total: rules.length,
    byType: {},
    bySeverity: {},
    byCategory: {},
    bySource: {}
  };

  for (const rule of rules) {
    for (const type of rule.appliesTo) {
      summary.byType[type] = (summary.byType[type] ?? 0) + 1;
    }

    summary.bySeverity[rule.severity] = (summary.bySeverity[rule.severity] ?? 0) + 1;
    summary.byCategory[rule.category] = (summary.byCategory[rule.category] ?? 0) + 1;
    summary.bySource[rule.source ?? "unknown"] = (summary.bySource[rule.source ?? "unknown"] ?? 0) + 1;
  }

  return summary;
}

function validateRule(rule) {
  if (!rule || typeof rule !== "object") {
    throw new TypeError("Rule must be an object.");
  }

  const requiredStrings = ["id", "severity", "category", "pattern", "rationale", "remediation"];
  for (const key of requiredStrings) {
    if (typeof rule[key] !== "string" || !rule[key].trim()) {
      throw new Error(`Rule ${rule.id ?? "<unknown>"} is missing string field: ${key}`);
    }
  }

  if (!severityRank[rule.severity]) {
    throw new Error(`Rule ${rule.id} has invalid severity: ${rule.severity}`);
  }

  if (!Array.isArray(rule.appliesTo) || rule.appliesTo.length === 0) {
    throw new Error(`Rule ${rule.id} must define appliesTo.`);
  }

  for (const type of rule.appliesTo) {
    if (!VALID_EVENT_TYPES.has(type)) {
      throw new Error(`Rule ${rule.id} has invalid event type: ${type}`);
    }
  }

  try {
    new RegExp(rule.pattern, "ims");
  } catch (error) {
    throw new Error(`Rule ${rule.id} has invalid regex: ${error.message}`);
  }
}

function loadRulePaths(paths) {
  const rules = [];
  for (const rulePath of paths) {
    const fullPath = path.resolve(process.cwd(), rulePath);
    const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const loadedRules = Array.isArray(parsed) ? parsed : parsed.rules;
    if (!Array.isArray(loadedRules)) {
      throw new Error(`Rule pack must be an array or { "rules": [...] }: ${fullPath}`);
    }

    rules.push(...loadedRules.map((rule) => ({ ...rule, source: fullPath })));
  }

  return rules;
}
