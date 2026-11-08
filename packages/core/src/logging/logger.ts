/** Minimal leveled logger. Set the level with `KENMARK_LOG_LEVEL` (default: info). */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentThreshold(): number {
  const envLevel = process.env.KENMARK_LOG_LEVEL as LogLevel | undefined;
  return LEVEL_ORDER[envLevel ?? "info"] ?? LEVEL_ORDER.info;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < currentThreshold()) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  const out = level === "error" || level === "warn" ? console.error : console.log;
  out(meta ? `${line} ${JSON.stringify(meta)}` : line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
