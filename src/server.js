import http from "node:http";
import { loadConfig } from "./config.js";
import { createExecEvent, createOpenEvent } from "./integrations/os-guard.js";
import { guardAndRecord } from "./guard.js";

export const DEFAULT_PORT = 7404;

export function startServer({
  config = loadConfig(),
  host = "127.0.0.1",
  port = Number(process.env.FOURGENT_POLICY_PORT ?? DEFAULT_PORT)
} = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/os-event") {
      await handleOsEvent(req, res, config);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`[404gent] Policy server listening on http://${host}:${actualPort}`);
  });

  return server;
}

export async function buildOsEvent(payload, config = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const agent = normalizeOptionalString(payload.agent);
  const pid = payload.pid;

  if (payload.type === "open") {
    const targetPath = normalizeRequiredString(payload.path, "path");
    const event = createOpenEvent(targetPath, {
      agent,
      pid,
      config: withNativeMode(config)
    });
    event.meta = {
      ...event.meta,
      authDecision: normalizeOptionalString(payload.authDecision),
      reason: normalizeOptionalString(payload.reason),
      cache: typeof payload.cache === "boolean" ? payload.cache : null
    };
    return event;
  }

  if (payload.type === "exec") {
    const argv = normalizeArgv(payload);
    return createExecEvent(argv, {
      agent,
      pid,
      config: withNativeMode(config)
    });
  }

  throw new Error(`Unsupported OS event type: ${payload.type}`);
}

async function handleOsEvent(req, res, config) {
  try {
    const payload = JSON.parse(await readRequestBody(req));
    const event = await buildOsEvent(payload, config);
    const report = await guardAndRecord(event, config);
    const topFinding = report.findings[0];

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      decision: report.decision,
      reason: topFinding?.rationale ?? null,
      findings: report.findings
    }));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

function readRequestBody(req, { limitBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > limitBytes) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeArgv(payload) {
  if (Array.isArray(payload.argv)) {
    const argv = payload.argv.map((arg) => String(arg));
    if (argv.length > 0) {
      return argv;
    }
  }

  if (payload.executable) {
    return [String(payload.executable)];
  }

  throw new Error("exec events require argv or executable.");
}

function normalizeRequiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} is required.`);
  }

  return value;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value);
}

function withNativeMode(config) {
  return {
    ...config,
    osGuard: {
      ...config.osGuard,
      mode: config.osGuard?.mode === "simulate"
        ? "native-notify"
        : (config.osGuard?.mode ?? "native-notify")
    }
  };
}
