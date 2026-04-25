import { analyzeEvent, mergeReports } from "./policy/engine.js";
import { analyzeWithLlm } from "./providers/llm.js";
import {
  logCmuxReport,
  notifyCmux,
  openCmuxQuarantinePane
} from "./integrations/cmux.js";
import { appendAuditLog } from "./report.js";
import { updateStateFromReport } from "./state.js";

export async function guard(event, config) {
  const ruleReport = analyzeEvent(event, config);
  const llmReport = await analyzeWithLlm(event, ruleReport, config);
  return mergeReports(ruleReport, llmReport, config);
}

export function recordReport(report, config) {
  appendAuditLog(report, config);
  updateStateFromReport(report, config);
  notifyCmux(report, config);
  logCmuxReport(report, config);
  openCmuxQuarantinePane(report, config);
}

export async function guardAndRecord(event, config) {
  const report = await guard(event, config);
  recordReport(report, config);
  return report;
}
