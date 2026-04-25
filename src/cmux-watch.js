import { createHash } from "node:crypto";

export function createScreenEvent(text, { agent, workspace, surface, maxChars } = {}) {
  const clipped = clipScreen(text, maxChars);
  return {
    type: "output",
    text: clipped,
    source: agent ? `agent:${agent}:cmux-screen` : "cmux-screen",
    meta: {
      cmuxScreen: true,
      workspace: workspace ?? null,
      surface: surface ?? null,
      originalChars: String(text ?? "").length,
      clipped: clipped.length < String(text ?? "").length
    }
  };
}

export function hashScreen(text) {
  return createHash("sha256").update(String(text ?? "")).digest("hex");
}

export function createInterruptLimiter({ maxInterrupts = 5, windowMs = 60000, now = () => Date.now() } = {}) {
  const timestamps = [];

  return {
    allow() {
      const current = now();
      while (timestamps.length > 0 && current - timestamps[0] >= windowMs) {
        timestamps.shift();
      }

      if (timestamps.length >= maxInterrupts) {
        return false;
      }

      timestamps.push(current);
      return true;
    },
    count() {
      const current = now();
      while (timestamps.length > 0 && current - timestamps[0] >= windowMs) {
        timestamps.shift();
      }
      return timestamps.length;
    }
  };
}

export function shouldProcessScreen(text, previousHash) {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    return { process: false, hash: previousHash, reason: "empty" };
  }

  const hash = hashScreen(normalized);
  if (hash === previousHash) {
    return { process: false, hash, reason: "duplicate" };
  }

  return { process: true, hash, reason: "changed" };
}

function clipScreen(text, maxChars) {
  const value = String(text ?? "");
  if (!maxChars || value.length <= maxChars) {
    return value;
  }

  return value.slice(Math.max(0, value.length - maxChars));
}
