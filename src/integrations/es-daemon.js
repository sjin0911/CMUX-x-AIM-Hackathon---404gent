export function getDaemonEndpoint(config = {}) {
  return process.env.FOURGENT_DAEMON_ENDPOINT
    || config.osGuard?.daemonEndpoint
    || "http://127.0.0.1:7405";
}

export function buildRegisterPidRequest({ pid, agent }) {
  const value = Number(pid);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("pid must be a positive integer");
  }

  return {
    pid: value,
    agent: agent ? String(agent) : undefined
  };
}

export async function registerOsGuardPID({ pid, agent, config = {}, timeoutMs = 500 } = {}) {
  const payload = buildRegisterPidRequest({ pid, agent });
  const endpoint = new URL("/register-pid", getDaemonEndpoint(config));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`daemon control returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
