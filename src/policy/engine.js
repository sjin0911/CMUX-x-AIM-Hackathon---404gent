import { getRules } from "./rules.js";
import { severityRank } from "./severity.js";

export { severityRank };

export function analyzeEvent(event, config = {}) {
  const normalized = normalizeEvent(event);
  const disabled = new Set(config.rules?.disabled ?? []);
  const findings = [];

  for (const rule of getRules(config)) {
    if (disabled.has(rule.id) || !rule.appliesTo.includes(normalized.type)) {
      continue;
    }

    const regex = new RegExp(rule.pattern, "ims");
    const match = regex.exec(normalized.text);
    if (!match) {
      continue;
    }

    findings.push({
      id: rule.id,
      severity: rule.severity,
      category: rule.category,
      rationale: rule.rationale,
      remediation: rule.remediation,
      match: clip(match[0])
    });
  }

  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  return {
    id: cryptoRandomId(),
    timestamp: new Date().toISOString(),
    event: normalized,
    decision: decide(findings, config),
    findings
  };
}

export function mergeReports(ruleReport, llmReport, config = {}) {
  if (!llmReport || llmReport.status === "skipped") {
    return ruleReport;
  }

  const findings = [
    ...ruleReport.findings,
    ...normalizeLlmFindings(llmReport)
  ].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  return {
    ...ruleReport,
    decision: decide(findings, config),
    findings,
    llm: {
      provider: llmReport.provider,
      model: llmReport.model,
      status: llmReport.status
    }
  };
}

export function maxSeverity(findings) {
  return findings.reduce((max, finding) => {
    return severityRank[finding.severity] > severityRank[max] ? finding.severity : max;
  }, "low");
}

function decide(findings, config) {
  if (findings.length === 0) {
    return "allow";
  }

  const blockSeverities = new Set(config.rules?.blockSeverities ?? ["critical", "high"]);
  if (findings.some((finding) => blockSeverities.has(finding.severity))) {
    return "block";
  }

  return "warn";
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object") {
    throw new TypeError("Event must be an object.");
  }

  if (!["prompt", "command", "output", "os"].includes(event.type)) {
    throw new TypeError(`Unsupported event type: ${event.type}`);
  }

  return {
    type: event.type,
    text: String(event.text ?? ""),
    source: event.source ?? "cli",
    meta: event.meta ?? {}
  };
}

function normalizeLlmFindings(llmReport) {
  return (llmReport.findings ?? []).map((finding, index) => ({
    id: finding.id ?? `llm.${index + 1}`,
    severity: normalizeSeverity(finding.severity),
    category: finding.category ?? "llm_review",
    rationale: finding.rationale ?? "LLM flagged this event as risky.",
    remediation: finding.remediation ?? "Review before continuing.",
    match: finding.match ? clip(finding.match) : "llm-review"
  }));
}

function normalizeSeverity(severity) {
  return severityRank[severity] ? severity : "medium";
}

function clip(value, max = 160) {
  const singleLine = String(value).replace(/\s+/g, " ").trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 3)}...` : singleLine;
}

function cryptoRandomId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
