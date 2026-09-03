import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

const ALWAYS_SENSITIVE = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
];

const PROD_SENSITIVE = [
  /otp/i,
  /email/i,
  /phone/i,
  /firstName/i,
  /lastName/i,
  /fullName/i,
  /name/i,
  /address/i,
  /ip/i,
  /userAgent/i,
];

const REDACTED = "[REDACTED]";

function shouldRedactKey(key: string): boolean {
  if (ALWAYS_SENSITIVE.some((pattern) => pattern.test(key))) {
    return true;
  }
  if (isProduction && PROD_SENSITIVE.some((pattern) => pattern.test(key))) {
    return true;
  }
  return false;
}

export function redactForLogs(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForLogs(item));
  }

  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, current] of Object.entries(input)) {
      output[key] = shouldRedactKey(key) ? REDACTED : redactForLogs(current);
    }
    return output;
  }

  return value;
}

export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) {
    return REDACTED;
  }
  if (local.length <= 2) {
    return `**@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}
