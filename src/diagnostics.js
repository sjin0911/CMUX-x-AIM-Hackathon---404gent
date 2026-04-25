import { redactSecrets } from "./report.js";

const CONTAMINATION_CATEGORIES = new Set([
  "prompt_injection",
  "guardrail_tampering",
  "secret_exfiltration",
  "secret_leak",
  "remote_code_execution",
  "backdoor_or_poisoning",
  "malware_or_abuse"
]);

export function buildContaminationDiagnosis(events, { targetId, limit = 12 } = {}) {
  const scoped = selectEvents(events, targetId).slice(-limit);
  const suspicious = scoped.filter((event) => (event.findings ?? []).length > 0);
  const contamination = [...suspicious].reverse().find(isContaminationEvent)
    ?? [...suspicious].reverse()[0]
    ?? scoped.at(-1)
    ?? null;

  const target = targetId ?? resolveTargetId(contamination) ?? resolveTargetId(scoped.at(-1)) ?? "local";
  const path = scoped.map((event, index) => buildStep(event, index + 1, target));
  const root = path.find((step) => step.isContamination) ?? path.find((step) => step.finding) ?? null;
  const followOn = root ? path.filter((step) => step.index > root.index) : [];
  const current = path.at(-1) ?? null;

  return {
    target,
    status: root?.isContamination ? "contaminated" : suspicious.length > 0 ? "at_risk" : "clean",
    rootCause: root ? summarizeRootCause(root) : "No contamination pattern found in the selected audit window.",
    narrative: buildNarrative({ root, followOn, current }),
    timeline: path,
    graph: buildGraph(path),
    playbook: buildPlaybook({ root, current })
  };
}

export function formatDiagnosis(diagnosis, { json = false } = {}) {
  if (json) {
    return JSON.stringify(diagnosis, null, 2);
  }

  const lines = [];
  lines.push("404gent Contamination Diagnosis");
  lines.push(`Target: ${diagnosis.target}`);
  lines.push(`Status: ${diagnosis.status.toUpperCase()}`);
  lines.push(`Root cause: ${diagnosis.rootCause}`);
  lines.push("");
  lines.push("Narrative:");
  lines.push(wrap(diagnosis.narrative));
  lines.push("");
  lines.push("Timeline:");

  if (diagnosis.timeline.length === 0) {
    lines.push("- No audit events in scope.");
  } else {
    for (const step of diagnosis.timeline) {
      const finding = step.finding
        ? `${step.finding.severity}/${step.finding.category}/${step.finding.id}`
        : "no findings";
      lines.push(`- [${step.index}] ${step.time} ${step.eventType} ${step.decision.toUpperCase()} ${finding}`);
      if (step.match) {
        lines.push(`  match: ${step.match}`);
      }
    }
  }

  lines.push("");
  lines.push("Contamination Graph:");
  lines.push(diagnosis.graph.length > 0 ? diagnosis.graph.join("\n") : "No graph nodes.");
  lines.push("");
  lines.push("Recovery Playbook:");
  for (const action of diagnosis.playbook) {
    lines.push(`- ${action}`);
  }

  return lines.join("\n");
}

function selectEvents(events, targetId) {
  const valid = (events ?? []).filter((event) => event && !event.parseError);
  if (!targetId) {
    return valid;
  }

  return valid.filter((event) => resolveTargetId(event) === targetId);
}

function buildStep(event, index, fallbackTarget) {
  const finding = event.findings?.[0] ?? null;
  return {
    index,
    id: event.id ?? `audit-${index}`,
    time: event.timestamp ?? "<no timestamp>",
    target: resolveTargetId(event) ?? fallbackTarget,
    source: event.event?.source ?? "unknown",
    eventType: event.event?.type ?? "unknown",
    decision: event.decision ?? "unknown",
    finding: finding ? {
      id: finding.id ?? "unknown",
      severity: finding.severity ?? "unknown",
      category: finding.category ?? "unknown",
      rationale: finding.rationale ?? "No rationale recorded.",
      remediation: finding.remediation ?? "Review before continuing."
    } : null,
    match: finding?.match ? redactSecrets(finding.match) : null,
    textPreview: preview(event.event?.text),
    isContamination: isContaminationEvent(event)
  };
}

function isContaminationEvent(event) {
  return (event?.findings ?? []).some((finding) => {
    return CONTAMINATION_CATEGORIES.has(finding.category)
      && ["high", "critical"].includes(finding.severity);
  });
}

function resolveTargetId(event) {
  const source = event?.event?.source ?? "";
  const agentMatch = /^agent:([^:]+):/.exec(source);
  if (agentMatch) {
    return `agent:${agentMatch[1]}`;
  }

  return source && source !== "scan-prompt" && source !== "scan-command" && source !== "scan-output"
    ? source
    : "local";
}

function summarizeRootCause(step) {
  if (!step.finding) {
    return "No finding was attached to the latest event.";
  }

  const match = step.match ? ` via "${step.match}"` : "";
  return `${step.finding.category} entered through ${step.eventType} from ${step.source}${match}.`;
}

function buildNarrative({ root, followOn, current }) {
  if (!root) {
    return "The selected audit window does not contain a risky finding. Keep the guard wrapper enabled so future prompt, command, and output events remain attributable.";
  }

  const followOnText = followOn.length > 0
    ? ` After that, ${followOn.length} follow-on event${followOn.length === 1 ? "" : "s"} appeared in the same target, ending with ${current.eventType}/${current.decision}.`
    : " No follow-on event was recorded after the contamination point.";

  return [
    `The likely contamination point is step ${root.index}: a ${root.eventType} event from ${root.source} matched ${root.finding.id}.`,
    root.finding.rationale,
    followOnText,
    "Treat later commands, outputs, and handoffs from this target as untrusted until a human reviews the audit trail and resets the target state."
  ].join(" ");
}

function buildGraph(path) {
  return path.map((step, index) => {
    const marker = step.isContamination ? "CONTAMINATED" : step.finding ? "RISK" : "OK";
    const arrow = index === path.length - 1 ? "" : " ->";
    const reason = step.finding ? ` ${step.finding.category}` : "";
    return `[${step.index}] ${step.eventType}:${step.decision} (${marker}${reason})${arrow}`;
  });
}

function buildPlaybook({ root, current }) {
  if (!root) {
    return [
      "Continue with guarded wrappers or native hooks.",
      "Run `node src/cli.js audit tail --limit 10` if more evidence is needed."
    ];
  }

  const targetFlag = root.target?.startsWith("agent:")
    ? ` --agent ${root.target.slice("agent:".length)}`
    : "";

  return [
    "Quarantine this target before sharing files, commands, or context with other agents.",
    `Remove or rewrite the contaminated ${root.eventType} content that matched ${root.finding.id}.`,
    root.finding.remediation,
    "Resume with a clean prompt that restates only the intended task and explicitly ignores untrusted embedded instructions.",
    `After review, reset sticky state with \`node src/cli.js status reset${targetFlag}\`.`,
    current?.decision === "block"
      ? "Do not retry the blocked command verbatim; create a safer replacement command first."
      : "Keep monitoring follow-on output for secret or instruction leakage."
  ];
}

function preview(value, max = 120) {
  const text = redactSecrets(String(value ?? "").replace(/\s+/g, " ").trim());
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function wrap(value, width = 88) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.join("\n");
}
