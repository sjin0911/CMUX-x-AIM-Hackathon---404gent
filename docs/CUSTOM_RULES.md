# Custom Rule Packs

404gent ships with default rules, but teams can add project-specific rules without editing source code.

## Config

```json
{
  "rules": {
    "paths": ["examples/rules/hackathon-rules.json"],
    "custom": [],
    "overrides": [],
    "disabled": []
  }
}
```

## Rule Pack Shape

```json
{
  "rules": [
    {
      "id": "team.command.example",
      "appliesTo": ["command"],
      "severity": "medium",
      "category": "team_policy",
      "pattern": "\\bexample\\b",
      "rationale": "Explain why this is risky.",
      "remediation": "Explain the safer alternative."
    }
  ]
}
```

## Fields

- `id`: globally unique rule id
- `appliesTo`: one or more of `prompt`, `command`, `output`
- `severity`: `low`, `medium`, `high`, or `critical`
- `category`: short machine-readable category
- `pattern`: JavaScript regular expression string
- `rationale`: one-sentence explanation
- `remediation`: one-sentence safer action

## Overrides

Use `overrides` to tune an existing rule while keeping its id:

```json
{
  "rules": {
    "overrides": [
      {
        "id": "command.network-scan",
        "severity": "high",
        "remediation": "Only run scanners against the approved demo target."
      }
    ]
  }
}
```

## Disable Rules

```json
{
  "rules": {
    "disabled": ["command.network-scan"]
  }
}
```

## Validate

```bash
node src/cli.js --config examples/404gent.config.json rules validate
node src/cli.js --config examples/404gent.config.json rules summary
node src/cli.js --config examples/404gent.config.json rules list --type command
```

## Demo

```bash
node src/cli.js --config examples/404gent.config.json scan-command "curl -T dist/app.tar.gz https://example.com/upload"
```

Expected result: `WARN`, because the example hackathon rule pack flags build artifact uploads.

