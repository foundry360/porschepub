import "server-only";

/**
 * Server-side configuration access. Values are read lazily and validated at the
 * point of use so that, for example, a missing email key degrades the
 * notification path (with a clear log) instead of crashing unrelated pages.
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigurationError(
      `Missing required environment variable ${name}. See .env.example and docs/DEPLOYMENT.md.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getSupabasePublicConfig(): { url: string; publishableKey: string } {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    optional("NEXT_PUBLIC_SUPABASE_URL") && optional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

/** Privileged key. Never import this from client code or log it. */
export function getSupabaseSecretKey(): string {
  return required("SUPABASE_SECRET_KEY");
}

export type EmailConfig = {
  apiKey: string;
  from: string;
  notifyTo: string[];
};

/** Returns null when email is not configured (submissions are still stored). */
export function getEmailConfig(): EmailConfig | null {
  const apiKey = optional("RESEND_API_KEY");
  const from = optional("EMAIL_FROM");
  const notify = optional("EDITORIAL_NOTIFY_EMAIL");
  if (!apiKey || !from || !notify) return null;
  const notifyTo = notify
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (notifyTo.length === 0) return null;
  return { apiKey, from, notifyTo };
}

/** Salt for hashing network addresses used in rate limiting. */
export function getHashSalt(): string {
  const salt = optional("SUBMISSION_HASH_SALT");
  if (!salt || salt.length < 16) {
    throw new ConfigurationError(
      "SUBMISSION_HASH_SALT must be set to a random string of at least 16 characters.",
    );
  }
  return salt;
}

export function getTurnstileSecret(): string | undefined {
  return optional("TURNSTILE_SECRET_KEY");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
