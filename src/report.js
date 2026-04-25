import fs from "node:fs";
import path from "node:path";

const SECRET_PATTERNS = [
  /-----BEGIN ([A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END ([A-Z0-9 ]+ )?PRIVATE KEY-----/g,
  /\b[A-Z0-9_]*(API_KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*=\s*['"]?[A-Za-z0-9_./+=:-]{12,}/g,
  /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"']+:[^\s"']+@[^\s"']+/g,
  /\b(Set-Cookie:|Cookie:)\s*[^\n]*(session|auth|token|jwt)[^\n]*/gi,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /https?:\/\/[^\s/]+:[^\s/]+@/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bASIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bghp_[A-Za-z0-9_]{36}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  /\bnpm_[A-Za-z0-9]{36}\b/g,
  /\bsk-[A-Za-z0-9_-]{24,}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /\b\d{6}-[1-4]\d{6}\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g
];

export function formatReport(report, { json = false } = {}) {
  if (json) {
    return JSON.stringify(redactReport(report), null, 2);
  }

  const lines = [];
  lines.push(`${decisionIcon(report.decision)} 404gent ${colorDecision(report.decision)} (${report.event.type})`);

  if (report.findings.length === 0) {
    lines.push("Status: no findings");
    return lines.join("\n");
  }

  const topFinding = report.findings[0];
  lines.push(`Risk: ${severityIcon(topFinding.severity)} ${colorSeverity(topFinding.severity)} / ${topFinding.category}`);
  lines.push(`Intent: ${inferIntent(topFinding, report.event)}`);
  lines.push(`Reason: ${topFinding.rationale}`);
  lines.push(`Action: ${topFinding.remediation}`);

  if (topFinding.match) {
    lines.push(`Matched: ${redactSecrets(topFinding.match)}`);
  }

  if (report.findings.length > 1) {
    lines.push("");
    lines.push("Additional findings:");
  }

  for (const finding of report.findings.slice(1)) {
    lines.push(`- ${severityIcon(finding.severity)} ${colorSeverity(finding.severity)} ${finding.id}`);
    lines.push(`  reason: ${finding.rationale}`);
    lines.push(`  action: ${finding.remediation}`);
    if (finding.match) {
      lines.push(`  matched: ${redactSecrets(finding.match)}`);
    }
  }

  if (report.llm) {
    lines.push("");
    lines.push(`LLM review: ${report.llm.provider}/${report.llm.model} ${report.llm.status}`);
  }

  return lines.join("\n");
}

export function appendAuditLog(report, config = {}) {
  if (!config.logging?.enabled) {
    return;
  }

  const logPath = path.resolve(process.cwd(), config.logging.path ?? ".404gent/events.jsonl");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(redactReport(report))}\n`, "utf8");
}

export function redactReport(report) {
  return {
    ...report,
    event: {
      ...report.event,
      text: redactSecrets(report.event.text)
    },
    findings: report.findings.map((finding) => ({
      ...finding,
      match: finding.match ? redactSecrets(finding.match) : finding.match
    }))
  };
}

export function redactSecrets(text) {
  let redacted = String(text ?? "");
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED_SECRET]");
  }
  return redacted;
}

export function shouldRedactOutput(report, config = {}) {
  if (config.output?.redact === false) {
    return false;
  }

  return report.findings.some((finding) => {
    return [
      "secret_leak",
      "secret_exfiltration",
      "pii_leak"
    ].includes(finding.category);
  });
}

function decisionIcon(decision) {
  return {
    allow: "✅",
    warn: "⚠️",
    block: "🛑"
  }[decision] ?? "•";
}

function severityIcon(severity) {
  return {
    critical: "🔴",
    high: "🔴",
    medium: "🟠",
    low: "🟢"
  }[severity] ?? "•";
}

function colorDecision(decision) {
  const label = String(decision || "unknown").toUpperCase();
  return color(label, {
    allow: "green",
    warn: "yellow",
    block: "red"
  }[decision]);
}

function colorSeverity(severity) {
  const label = String(severity || "unknown").toUpperCase();
  return color(label, {
    critical: "red",
    high: "red",
    medium: "yellow",
    low: "green"
  }[severity]);
}

function color(text, name) {
  if (!supportsColor() || !name) {
    return text;
  }

  const codes = {
    red: [31, 39],
    yellow: [33, 39],
    green: [32, 39]
  };
  const pair = codes[name];
  return pair ? `\u001b[${pair[0]}m${text}\u001b[${pair[1]}m` : text;
}

function supportsColor() {
  if (process.env.NO_COLOR) {
    return false;
  }

  return Boolean(process.env.FORCE_COLOR || process.stdout?.isTTY || process.stderr?.isTTY);
}

function inferIntent(finding, event = {}) {
  const category = finding.category;
  const text = String(event.text || "");

  if (category === "prompt_injection") {
    return "The prompt appears to override higher-priority agent instructions.";
  }

  if (category === "secret_exfiltration") {
    return "The action appears to move secrets toward an external destination.";
  }

  if (category === "secret_discovery") {
    return "The action appears to inspect files that commonly contain credentials.";
  }

  if (category === "secret_leak") {
    return "The output appears to expose a credential or connection secret.";
  }

  if (category === "remote_code_execution") {
    return "The command appears to create remote execution or an interactive remote shell.";
  }

  if (category?.startsWith("destructive")) {
    return "The command appears to remove or mutate high-impact local, cloud, or infrastructure resources.";
  }

  if (category === "reconnaissance") {
    return "The command appears to enumerate network or service information.";
  }

  if (/\b(curl|wget|nc|scp|rsync|ftp|sftp)\b/i.test(text)) {
    return "The action includes network transfer behavior and needs context-aware review.";
  }

  return "The action matched a local safety policy and needs review.";
}
