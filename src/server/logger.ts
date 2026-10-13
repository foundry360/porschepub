import "server-only";

/**
 * Minimal structured logger.
 *
 * Output is one JSON line per event so Vercel / log drains can index it. Fields
 * that commonly carry personal or sensitive data are redacted, and callers
 * should still avoid passing submission bodies or secrets at all.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const REDACTED_KEYS = new Set([
  "email",
  "name",
  "pitch",
  "additionalinfo",
  "additional_info",
  "password",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "secret",
  "ip",
  "portfoliourl",
  "portfolio_url",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Fields = {};
    for (const [key, inner] of Object.entries(value as Fields)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(inner, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 300) return `${value.slice(0, 300)}…`;
  return value;
}

function serializeError(error: unknown): Fields {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 500) };
  }
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; code?: unknown };
    return {
      message: typeof candidate.message === "string" ? candidate.message.slice(0, 500) : "unknown",
      code: typeof candidate.code === "string" ? candidate.code : undefined,
    };
  }
  return { message: String(error).slice(0, 500) };
}

function write(level: Level, event: string, fields?: Fields, error?: unknown) {
  if (process.env.VITEST && process.env.LOG_IN_TESTS !== "1") return;
  const line = JSON.stringify({
    level,
    event,
    // A timing API rather than `new Date()`: logging can happen during prerendering.
    time: new Date(performance.timeOrigin + performance.now()).toISOString(),
    ...(fields ? (redact(fields) as Fields) : {}),
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => write("debug", event, fields),
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields, error?: unknown) => write("warn", event, fields, error),
  error: (event: string, fields?: Fields, error?: unknown) => write("error", event, fields, error),
};
