import { analyzeEvent } from "./policy/engine.js";
import { notifyCmux } from "./integrations/cmux.js";
import { updateStateFromReport } from "./state.js";
import {
  appendAuditLog,
  redactSecrets,
  shouldRedactOutput
} from "./report.js";

const DEFAULT_BUFFER_BYTES = 16 * 1024;
const DEFAULT_BUFFER_MS = 100;
const DEFAULT_MAX_SCAN_BYTES = 256 * 1024;

export function createOutputMonitor(config = {}, { source = "run" } = {}) {
  const settings = {
    bufferBytes: config.performance?.outputBufferBytes ?? DEFAULT_BUFFER_BYTES,
    bufferMs: config.performance?.outputBufferMs ?? DEFAULT_BUFFER_MS,
    maxScanBytes: config.performance?.maxOutputScanBytes ?? DEFAULT_MAX_SCAN_BYTES
  };
  const state = {
    stdout: createStreamState(),
    stderr: createStreamState()
  };

  function write(chunk, streamName) {
    const stream = state[streamName] ?? state.stdout;
    stream.buffer += chunk.toString("utf8");

    if (Buffer.byteLength(stream.buffer, "utf8") >= settings.bufferBytes) {
      flush(streamName);
      return;
    }

    if (!stream.timer) {
      stream.timer = setTimeout(() => flush(streamName), settings.bufferMs);
    }
  }

  function flush(streamName) {
    const stream = state[streamName] ?? state.stdout;
    if (stream.timer) {
      clearTimeout(stream.timer);
      stream.timer = null;
    }

    if (!stream.buffer) {
      return;
    }

    const text = stream.buffer;
    stream.buffer = "";
    const report = analyzeEvent(
      {
        type: "output",
        text: scanText(text, settings.maxScanBytes),
        source,
        meta: {
          stream: streamName,
          bufferedBytes: Buffer.byteLength(text, "utf8")
        }
      },
      config
    );

    if (report.findings.length > 0) {
      appendAuditLog(report, config);
      updateStateFromReport(report, config);
      notifyCmux(report, config);
    }

    const output = shouldRedactOutput(report, config) ? redactSecrets(text) : text;
    const target = streamName === "stdout" ? process.stdout : process.stderr;
    target.write(output);
  }

  function flushAll() {
    flush("stdout");
    flush("stderr");
  }

  return { write, flush, flushAll };
}

function createStreamState() {
  return {
    buffer: "",
    timer: null
  };
}

function scanText(text, maxScanBytes) {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= maxScanBytes) {
    return text;
  }

  return text.slice(0, maxScanBytes);
}

