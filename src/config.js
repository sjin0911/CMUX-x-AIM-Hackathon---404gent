import fs from "node:fs";
import path from "node:path";

export const defaultConfig = {
  rules: {
    disabled: [],
    blockSeverities: ["critical", "high"],
    paths: [],
    custom: [],
    overrides: []
  },
  llm: {
    enabled: false,
    provider: "gemini",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    timeoutMs: 7000,
    runOn: ["medium"],
    maxInputChars: 8000,
    maxFindings: 5,
    redactInputs: true
  },
  cmux: {
    notify: true,
    status: true,
    log: true,
    progress: true,
    quarantinePane: false
  },
  logging: {
    enabled: true,
    path: ".404gent/events.jsonl"
  },
  state: {
    enabled: true,
    path: ".404gent/state.json"
  },
  osGuard: {
    enabled: true,
    mode: "simulate",
    sensitivePaths: [
      ".env",
      ".env.*",
      "id_rsa",
      "id_ed25519",
      ".npmrc",
      ".pypirc",
      ".netrc",
      ".kube/config",
      "credentials",
      "credentials.json",
      "secrets.json",
      "service-account"
    ],
    blockExecutables: ["rm", "dd", "mkfs", "diskutil"],
    warnExecutables: ["curl", "wget", "nc", "ncat", "netcat", "scp", "rsync", "nmap"]
  },
  performance: {
    outputBufferBytes: 16384,
    outputBufferMs: 100,
    maxOutputScanBytes: 262144,
    cmuxStatusThrottleMs: 1000
  }
};

const CONFIG_CANDIDATES = [
  "404gent.config.json",
  ".404gent/config.json"
];

export function loadConfig({ cwd = process.cwd(), configPath } = {}) {
  const resolvedPath = resolveConfigPath(cwd, configPath);
  if (!resolvedPath) {
    return { ...defaultConfig, _path: null };
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...deepMerge(defaultConfig, parsed),
    _path: resolvedPath
  };
}

function resolveConfigPath(cwd, configPath) {
  if (configPath) {
    const candidate = path.isAbsolute(configPath)
      ? configPath
      : path.join(cwd, configPath);
    return fs.existsSync(candidate) ? candidate : fail(`Config not found: ${candidate}`);
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const fullPath = path.join(cwd, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override ?? base;
  }

  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return result;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(message);
}
