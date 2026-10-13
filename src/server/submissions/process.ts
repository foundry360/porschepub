import "server-only";
import { submissionPolicy, SUBMISSION_TERMS_VERSION } from "@/config/site";
import {
  detectBotSignals,
  validateSubmission,
  type RawSubmission,
  type SubmissionFieldErrors,
} from "@/lib/validation/submission";
import { newSubmissionEmail } from "@/server/email/templates";
import type { EmailProvider } from "@/server/email/provider";
import { getEmailConfig } from "@/server/env";
import { logger } from "@/server/logger";
import type { RateLimitResult } from "@/server/security/rate-limit";
import type { Db } from "@/server/supabase/clients";

export type SubmissionOutcome =
  | { kind: "created"; id: string; notification: "sent" | "failed" | "skipped" }
  | { kind: "invalid"; errors: SubmissionFieldErrors }
  | { kind: "bot" }
  | { kind: "too_fast" }
  | { kind: "verification_failed" }
  | { kind: "rate_limited" }
  | { kind: "unavailable" };

export type SubmissionDeps = {
  db: Db;
  email: EmailProvider;
  rateLimit: (key: string, limit: number, windowSeconds: number) => Promise<RateLimitResult>;
  hash: (value: string, namespace: string) => string;
  verifyHuman: (token: string, ip: string) => Promise<boolean>;
  /** Notification recipients; defaults to EDITORIAL_NOTIFY_EMAIL. */
  notifyTo?: string[];
};

const ATTEMPTS_PER_HOUR = 30;

/**
 * The complete submission pipeline. Dependencies are injected so the exact
 * production logic can be exercised in integration tests against a real
 * database with a fake email provider.
 *
 * Guarantees:
 *   - nothing is published or auto-accepted; rows start as `submitted`
 *   - a stored submission is never lost because email failed
 *   - the outcome tells the truth about what happened
 */
export async function processSubmission(
  raw: RawSubmission,
  context: { ip: string },
  deps: SubmissionDeps,
): Promise<SubmissionOutcome> {
  const ipHash = deps.hash(context.ip, "ip");

  const attempts = await deps.rateLimit(`attempt:${ipHash}`, ATTEMPTS_PER_HOUR, 3600);
  if (!attempts.allowed) {
    return attempts.reason === "unavailable" ? { kind: "unavailable" } : { kind: "rate_limited" };
  }

  const signal = detectBotSignals(raw, submissionPolicy.minFillSeconds);
  if (signal === "honeypot") {
    logger.info("submission.rejected", { reason: "honeypot" });
    return { kind: "bot" };
  }
  if (signal === "too-fast") {
    logger.info("submission.rejected", { reason: "too_fast" });
    return { kind: "too_fast" };
  }

  const validation = validateSubmission(raw);
  if (!validation.ok) return { kind: "invalid", errors: validation.errors };
  const input = validation.data;

  if (!(await deps.verifyHuman(raw.turnstileToken, context.ip))) {
    logger.info("submission.rejected", { reason: "verification_failed" });
    return { kind: "verification_failed" };
  }

  const perIp = await deps.rateLimit(
    `submit:ip:${ipHash}`,
    submissionPolicy.perIpLimit,
    submissionPolicy.perIpWindowSeconds,
  );
  if (!perIp.allowed) {
    return perIp.reason === "unavailable" ? { kind: "unavailable" } : { kind: "rate_limited" };
  }
  const perEmail = await deps.rateLimit(
    `submit:email:${deps.hash(input.email, "email")}`,
    submissionPolicy.perEmailLimit,
    submissionPolicy.perEmailWindowSeconds,
  );
  if (!perEmail.allowed) {
    return perEmail.reason === "unavailable" ? { kind: "unavailable" } : { kind: "rate_limited" };
  }

  // The category must exist; never trust the submitted id.
  const { data: category, error: categoryError } = await deps.db
    .from("categories")
    .select("id, name")
    .eq("id", input.categoryId as string)
    .maybeSingle();
  if (categoryError) {
    logger.error("submission.category_lookup_failed", { code: categoryError.code }, categoryError);
    return { kind: "unavailable" };
  }
  if (!category) return { kind: "invalid", errors: { categoryId: "Please choose a category from the list." } };

  const { data: row, error: insertError } = await deps.db
    .from("submissions")
    .insert({
      name: input.name,
      email: input.email,
      title: input.title,
      subject: input.subject,
      category_id: category.id,
      pitch: input.pitch,
      portfolio_url: input.portfolioUrl,
      additional_info: input.additionalInfo,
      consent_version: SUBMISSION_TERMS_VERSION,
      consented_at: new Date().toISOString(),
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    logger.error("submission.insert_failed", { code: insertError?.code }, insertError);
    return { kind: "unavailable" };
  }

  logger.info("submission.created", { submissionId: row.id });

  // Notification is best-effort and must never lose the stored submission.
  let notification: "sent" | "failed" | "skipped" = "skipped";
  let failureReason: string | null = null;
  try {
    const recipients = deps.notifyTo ?? getEmailConfig()?.notifyTo ?? [];
    if (recipients.length === 0) {
      notification = "skipped";
    } else {
      const message = newSubmissionEmail({
        id: row.id,
        name: input.name,
        email: input.email,
        title: input.title,
        subject: input.subject,
        categoryName: category.name,
        pitchExcerpt: input.pitch.length > 400 ? `${input.pitch.slice(0, 400)}…` : input.pitch,
      });
      const result = await deps.email.send({ to: recipients, replyTo: input.email, ...message });
      if (result.status === "sent") notification = "sent";
      else if (result.status === "skipped") notification = "skipped";
      else {
        notification = "failed";
        failureReason = result.reason;
      }
    }
  } catch (error) {
    notification = "failed";
    failureReason = error instanceof Error ? error.name : "unknown error";
  }

  if (notification === "failed") {
    logger.error("submission.notification_failed", { submissionId: row.id, reason: failureReason });
  } else if (notification === "skipped") {
    logger.warn("submission.notification_skipped", { submissionId: row.id });
  }

  const { error: updateError } = await deps.db
    .from("submissions")
    .update({
      notification_status: notification,
      notification_error: failureReason ? failureReason.slice(0, 300) : null,
    })
    .eq("id", row.id);
  if (updateError) {
    logger.error("submission.notification_status_update_failed", { submissionId: row.id }, updateError);
  }

  return { kind: "created", id: row.id, notification };
}
