"use server";

import type { SubmissionFieldErrors } from "@/lib/validation/submission";
import { rawSubmissionFromFormData } from "@/lib/validation/submission";
import { getEmailProvider } from "@/server/email/provider";
import { hashIdentifier, getClientAddress } from "@/server/security/request";
import { checkRateLimit } from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";
import { processSubmission } from "@/server/submissions/process";
import { createServiceClient } from "@/server/supabase/clients";
import { logger } from "@/server/logger";

export type SubmissionFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      errors?: SubmissionFieldErrors;
      values?: Record<string, string>;
    };

const FIELD_NAMES = ["name", "email", "title", "subject", "categoryId", "pitch", "portfolioUrl", "additionalInfo"] as const;

export async function submitStoryAction(
  _previous: SubmissionFormState,
  formData: FormData,
): Promise<SubmissionFormState> {
  const raw = rawSubmissionFromFormData(formData);
  const turnstile = formData.get("cf-turnstile-response");
  if (!raw.turnstileToken && typeof turnstile === "string") raw.turnstileToken = turnstile.slice(0, 4096);

  const values: Record<string, string> = {};
  for (const field of FIELD_NAMES) values[field] = raw[field].slice(0, 6000);

  try {
    const ip = await getClientAddress();
    const outcome = await processSubmission(
      raw,
      { ip },
      {
        db: createServiceClient(),
        email: getEmailProvider(),
        rateLimit: checkRateLimit,
        hash: hashIdentifier,
        verifyHuman: verifyTurnstile,
      },
    );

    switch (outcome.kind) {
      case "created":
        return {
          status: "success",
          message:
            "Thank you. Your story has been received and saved. An editor will read it and reply by email if it looks like a fit. We can’t promise a reply to every story, and nothing is published without your agreement.",
        };
      case "bot":
        // Do not reveal the honeypot. Nothing was stored.
        return {
          status: "success",
          message: "Thank you. Your story has been received.",
        };
      case "invalid":
        return {
          status: "error",
          message: "Please check the highlighted fields and try again.",
          errors: outcome.errors,
          values,
        };
      case "too_fast":
        return {
          status: "error",
          message: "That was very quick. Please review your story and submit again.",
          values,
        };
      case "verification_failed":
        return {
          status: "error",
          message: "We couldn’t verify that you’re human. Please try again.",
          values,
        };
      case "rate_limited":
        return {
          status: "error",
          message: "We’ve received several stories from you recently. Please try again later.",
          values,
        };
      case "unavailable":
        return {
          status: "error",
          message:
            "We couldn’t save your story right now, so it has not been sent. Please try again in a few minutes.",
          values,
        };
    }
  } catch (error) {
    logger.error("submission.action_failed", undefined, error);
    return {
      status: "error",
      message:
        "Something went wrong and your story has not been sent. Please try again in a few minutes.",
      values,
    };
  }
}
