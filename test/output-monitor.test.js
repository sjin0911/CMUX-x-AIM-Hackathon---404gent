import test from "node:test";
import assert from "node:assert/strict";
import { createOutputMonitor } from "../src/output-monitor.js";

test("output monitor buffers and redacts risky output", () => {
  const originalWrite = process.stdout.write;
  let output = "";

  process.stdout.write = (chunk) => {
    output += String(chunk);
    return true;
  };

  try {
    const monitor = createOutputMonitor({
      cmux: { notify: false, status: false },
      logging: { enabled: false },
      state: { enabled: false },
      performance: {
        outputBufferBytes: 1024,
        outputBufferMs: 1000,
        maxOutputScanBytes: 4096
      }
    }, { source: "test" });

    monitor.write(Buffer.from("OPENAI_API_KEY=sk-1234567890abcdefghijklmnop\n"), "stdout");
    monitor.flushAll();
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.equal(output, "[REDACTED_SECRET]\n");
});

