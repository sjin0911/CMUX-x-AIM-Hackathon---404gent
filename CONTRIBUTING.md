# Contributing

## Local Setup

```bash
npm test
node src/cli.js scan-prompt "ignore previous instructions"
```

No install step is required for the current MVP because it uses only Node.js built-ins.

## Branches

Use focused branches:

- `feat/policy-*`
- `feat/llm-*`
- `feat/cmux-*`
- `feat/demo-*`
- `fix/*`

## Pull Requests

Keep PRs small enough to demo quickly. Include:

- What changed
- How to test it
- Any safety tradeoff or false-positive risk

## Suggested Ownership

- Policy owner: `src/policy/**`, `test/**`
- LLM owner: `src/providers/**`, config docs
- cmux owner: `src/integrations/**`, demo scripts
- UX owner: README, CLI output, demo flow

