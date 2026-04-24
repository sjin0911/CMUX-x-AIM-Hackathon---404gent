# Performance Notes

404gent is a runtime guardrail, so it must not make agent workflows feel slow.

## Hot Paths

| Path | Cost | Current Strategy |
| --- | --- | --- |
| `scan-prompt` | low | Rule scan once before agent input |
| `scan-command` | low | Rule scan once before shell execution |
| `run` command preflight | low | Rule scan once before launch |
| `run`/`agent` output scanning | medium | Buffered output scanning |
| cmux status updates | low/medium | Throttled status sync |
| Gemini LLM review | high | Disabled by default; optional escalation only |

## Output Buffering

Output scanning is the main performance-sensitive path. 404gent buffers stdout/stderr before scanning so it does not run the full rule engine on every tiny terminal chunk.

Default config:

```json
{
  "performance": {
    "outputBufferBytes": 16384,
    "outputBufferMs": 100,
    "maxOutputScanBytes": 262144,
    "cmuxStatusThrottleMs": 1000
  }
}
```

Meaning:

- scan output after 16 KB or 100 ms, whichever comes first
- scan at most 256 KB per buffered chunk
- throttle repeated cmux status updates to once per second when the state has not changed

## LLM Is Not In The Hot Path

Gemini review is disabled by default. It should be used for:

- ambiguous medium-risk cases
- no-rule cases with suspicious intent
- judge demo fallback through mock mode

Avoid calling an LLM before every shell command. That will make agent workflows feel slow.

## Benchmark

Run:

```bash
npm run bench
```

This benchmarks:

- safe command scanning
- blocked command scanning
- guarded output with 5,000 lines
- guarded output with repeated secret redaction

The benchmark config disables logging, state writes, cmux status, and LLM calls so it measures the guard path rather than local environment side effects.

## Tuning

For high-volume logs, increase buffer size:

```json
{
  "performance": {
    "outputBufferBytes": 65536,
    "outputBufferMs": 150
  }
}
```

For lower-latency redaction, lower buffer time:

```json
{
  "performance": {
    "outputBufferBytes": 8192,
    "outputBufferMs": 25
  }
}
```

Tradeoff:

- smaller buffers: lower redaction latency, more CPU overhead
- larger buffers: lower overhead, output appears in slightly larger bursts

