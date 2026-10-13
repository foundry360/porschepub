import "server-only";
import { getTurnstileSecret } from "@/server/env";
import { logger } from "@/server/logger";

export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSecret());
}

/**
 * Verify a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured.
 * Returns true when Turnstile is not configured (the other protections still
 * apply) so the form works before the integration is set up.
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = getTurnstileSecret();
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn("turnstile.http_error", { status: response.status });
      return false;
    }
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    logger.warn("turnstile.exception", undefined, error);
    return false;
  }
}
