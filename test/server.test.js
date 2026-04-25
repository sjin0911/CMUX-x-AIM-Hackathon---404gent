import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startServer } from "../src/server.js";
import { defaultConfig } from "../src/config.js";

test("policy server blocks sensitive OS open events", async () => {
  const server = startServer({ config: testConfig(), port: 0 });
  await once(server, "listening");

  try {
    const response = await postJson(server, {
      type: "open",
      path: ".env",
      pid: 1234,
      agent: "demo"
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.decision, "block");
    assert.equal(response.body.findings[0].id, "os.sensitive-file-open");
  } finally {
    server.close();
  }
});

test("policy server warns on network executable OS exec events", async () => {
  const server = startServer({ config: testConfig(), port: 0 });
  await once(server, "listening");

  try {
    const response = await postJson(server, {
      type: "exec",
      argv: ["curl", "https://example.com/upload"],
      pid: 1234
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.decision, "warn");
    assert.equal(response.body.findings[0].id, "os.network-tool-exec");
  } finally {
    server.close();
  }
});

test("policy server rejects invalid OS events", async () => {
  const server = startServer({ config: testConfig(), port: 0 });
  await once(server, "listening");

  try {
    const response = await postJson(server, {
      type: "open",
      pid: 1234
    });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /path is required/);
  } finally {
    server.close();
  }
});

async function postJson(server, payload) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/os-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

function testConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "404gent-server-"));
  return {
    ...defaultConfig,
    cmux: {
      notify: false,
      status: false,
      log: false,
      progress: false,
      quarantinePane: false
    },
    logging: {
      enabled: true,
      path: path.join(dir, "events.jsonl")
    },
    state: {
      enabled: true,
      path: path.join(dir, "state.json")
    },
    llm: {
      ...defaultConfig.llm,
      enabled: false
    }
  };
}
