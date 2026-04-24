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
  lines.push(`404gent decision: ${report.decision.toUpperCase()} (${report.event.type})`);

  if (report.findings.length === 0) {
    lines.push("No findings.");
    return lines.join("\n");
  }

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.id}: ${finding.rationale}`);
    lines.push(`  remediation: ${finding.remediation}`);
    if (finding.match) {
      lines.push(`  match: ${redactSecrets(finding.match)}`);
    }
  }

  if (report.llm) {
    lines.push(`LLM: ${report.llm.provider}/${report.llm.model} ${report.llm.status}`);
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
