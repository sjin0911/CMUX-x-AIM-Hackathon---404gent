# Hackathon Roadmap

## Phase 1: Working Guard CLI

- Build local rule engine.
- Support prompt, command, and output event types.
- Print readable decisions and JSON output.
- Persist JSONL audit logs.

## Phase 2: cmux Demo

- Trigger `cmux notify` on warn/block.
- Create a demo workspace with one safe agent flow and one blocked flow.
- Add a short terminal recording or screenshot.
- Add `doctor`, `audit summary`, and `rules summary` so judges can inspect the system state quickly.

## Phase 3: LLM Review

- Enable Gemini review from config.
- Ask for strict JSON output: severity, category, rationale, and recommended action.
- Run LLM only for ambiguous or medium-risk events to keep latency low.

## Phase 4: Agent Hooks

- Wrap command execution through `404gent run --`.
- Add examples for Claude Code, Codex, Gemini CLI, and OpenCode where available.
- Capture before/after screenshots for judging.

## Phase 5: Pitch Polish

- Lead with the safety story: "EDR for AI coding agents in your terminal."
- Show attacks: prompt injection, secret exfiltration, destructive command, poisoned output.
- Show defenses: local rules, LLM escalation, cmux alerts, audit trail.
- Keep the claim precise: wrappers/hooks provide blocking; cmux provides status, notifications, and workspace visibility.
- Prefer `npm run demo:judge` for final judging so audit/status counts are deterministic.
- Mention performance explicitly: output scanning is buffered, cmux status is throttled, and LLM review is off the hot path.

## Phase 6: Policy Packs

- Load custom JSON rule packs from config.
- Add team-specific policy packs for hackathon demos, enterprise repos, and cloud environments.
- Support rule overrides and disabled rules for false-positive tuning.
