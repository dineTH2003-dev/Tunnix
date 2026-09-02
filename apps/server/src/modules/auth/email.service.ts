import { env } from "../../core/env";
import { logInfo, logWarn } from "../../core/logging";

/**
 * Send OTP code via Brevo email API.
 * Logs code if API key is not configured or in dev mode.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  if (!env.BREVO_API_KEY) {
    logWarn("email", `BREVO_API_KEY missing. OTP email to ${email} suppressed. (OTP: ${otp})`);
    return true;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.EMAIL_FROM_ADDRESS, name: env.APP_NAME },
        to: [{ email }],
        subject: `Your ${env.APP_NAME} Verification Code`,
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>${env.APP_NAME} Verification Code</h2>
            <p>Your 6-digit login verification code is:</p>
            <h1 style="letter-spacing: 5px; color: #4F46E5;">${otp}</h1>
            <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logWarn("email", "Brevo email send failed", { status: res.status, body: errBody });
      return false;
    }

    logInfo("email", `OTP email sent to ${email}`);
    return true;
  } catch (err) {
    logWarn("email", "Exception while sending email via Brevo", { error: String(err) });
    return false;
  }
}
