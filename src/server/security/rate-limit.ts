import "server-only";
import { logger } from "@/server/logger";
import { createServiceClient } from "@/server/supabase/clients";

export type RateLimitResult = { allowed: true } | { allowed: false; reason: "limited" | "unavailable" };

/**
 * Fixed-window counter backed by Postgres (`consume_rate_limit`). Keys must be
 * pre-hashed by the caller. Fails CLOSED: if the limiter cannot be consulted we
 * refuse the request, because the same database is needed to store it anyway.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      logger.error("rate_limit.rpc_failed", { code: error.code }, error);
      return { allowed: false, reason: "unavailable" };
    }
    return data === true ? { allowed: true } : { allowed: false, reason: "limited" };
  } catch (error) {
    logger.error("rate_limit.exception", undefined, error);
    return { allowed: false, reason: "unavailable" };
  }
}
