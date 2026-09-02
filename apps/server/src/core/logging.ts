import { redactForLogs } from "./redaction";

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, domain: string, message: string, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? (redactForLogs(meta) as Record<string, unknown>) : {};
  const entry = {
    ts: new Date().toISOString(),
    level,
    domain,
    msg: message,
    ...redactedMeta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logInfo = (domain: string, message: string, meta?: Record<string, unknown>) =>
  log("info", domain, message, meta);

export const logWarn = (domain: string, message: string, meta?: Record<string, unknown>) =>
  log("warn", domain, message, meta);

export const logError = (domain: string, message: string, meta?: Record<string, unknown>) =>
  log("error", domain, message, meta);

export const logDebug = (domain: string, message: string, meta?: Record<string, unknown>) =>
  log("debug", domain, message, meta);
