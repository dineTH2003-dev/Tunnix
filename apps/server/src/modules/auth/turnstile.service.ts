import { env } from "../../core/env";
import { ApiError } from "../../core/errors";
import { logWarn } from "../../core/logging";

/**
 * Verify Cloudflare Turnstile token.
 * Bypasses in dev if TURNSTILE_BYPASS_IN_DEV is true.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  if (env.TURNSTILE_BYPASS_IN_DEV && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!token) {
    throw new ApiError(400, "TURNSTILE_MISSING", "CAPTCHA verification token required.");
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    logWarn("auth", "TURNSTILE_SECRET_KEY is empty; allowing token in non-strict mode");
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      logWarn("auth", "Turnstile verification failed", { errorCodes: data["error-codes"] });
      throw new ApiError(400, "TURNSTILE_FAILED", "CAPTCHA verification failed.");
    }

    return true;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logWarn("auth", "Error calling Turnstile API", { error: String(err) });
    throw new ApiError(500, "TURNSTILE_ERROR", "Failed to verify CAPTCHA.");
  }
}
