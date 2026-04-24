import test from "node:test";
import assert from "node:assert/strict";
import { analyzeEvent } from "../src/policy/engine.js";
import { defaultConfig } from "../src/config.js";
import {
  buildGeminiRequest,
  parseGeminiResponse,
  shouldRunLlm
} from "../src/providers/llm.js";

test("Gemini request uses structured JSON output and redacts inputs", () => {
  const event = {
    type: "prompt",
    text: "Please inspect OPENAI_API_KEY=sk-1234567890abcdefghijklmnop"
  };
  const ruleReport = analyzeEvent(event, defaultConfig);
  const request = buildGeminiRequest(event, ruleReport, defaultConfig.llm);
  const requestText = request.contents[0].parts[0].text;

  assert.equal(request.generationConfig.responseMimeType, "application/json");
  assert.equal(request.generationConfig.responseJsonSchema.required[0], "findings");
  assert.match(requestText, /\[REDACTED_SECRET\]/);
  assert.doesNotMatch(requestText, /sk-1234567890abcdefghijklmnop/);
});

test("parses and normalizes Gemini JSON responses", () => {
  const parsed = parseGeminiResponse(
    {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  findings: [
                    {
                      id: "llm.hidden_exfil",
                      severity: "critical",
                      category: "secret_exfiltration",
                      rationale: "The prompt asks for hidden credential extraction.",
                      remediation: "Refuse the request.",
                      match: "extract credentials"
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    },
    defaultConfig.llm
  );

  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0].severity, "critical");
});

test("LLM run policy follows runOn settings", () => {
  const allowReport = analyzeEvent(
    { type: "prompt", text: "Summarize the README." },
    defaultConfig
  );
  const warnReport = analyzeEvent(
    { type: "command", text: "nmap -sV scanme.example" },
    defaultConfig
  );
  const blockReport = analyzeEvent(
    { type: "command", text: "rm -rf /" },
    defaultConfig
  );

  assert.equal(shouldRunLlm(allowReport, { runOn: ["allow"] }), true);
  assert.equal(shouldRunLlm(warnReport, { runOn: ["medium"] }), true);
  assert.equal(shouldRunLlm(blockReport, { runOn: ["medium"] }), false);
});

