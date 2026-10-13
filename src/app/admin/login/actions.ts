"use server";

import { redirect } from "next/navigation";
import { errorState, formString, type FormState } from "@/lib/editorial/form-state";
import { getEditorContext } from "@/server/auth/session";
import { checkRateLimit } from "@/server/security/rate-limit";
import { getClientAddress, hashIdentifier } from "@/server/security/request";
import { createSessionClient } from "@/server/supabase/clients";
import { logger } from "@/server/logger";

/** Only allow same-site /admin paths as post-login destinations (no open redirect). */
function safeNext(value: string): string {
  if (/^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(value) && !value.startsWith("//") && !value.startsWith("/admin/login")) {
    return value;
  }
  return "/admin";
}

const GENERIC_FAILURE = "That email and password didn’t match an editorial account.";

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = formString(formData, "email").trim().toLowerCase().slice(0, 254);
  const password = formString(formData, "password").slice(0, 200);
  const next = safeNext(formString(formData, "next"));

  if (!email || !password) return errorState("Enter your email and password.");

  // Throttle guessing per IP. Fails closed if the limiter is unavailable.
  try {
    const ip = await getClientAddress();
    const result = await checkRateLimit(`login:ip:${hashIdentifier(ip, "login-ip")}`, 20, 900);
    if (!result.allowed && result.reason === "unavailable") {
      return errorState("Sign-in is temporarily unavailable. Please try again shortly.");
    }
    if (!result.allowed) return errorState("Too many sign-in attempts. Please wait a few minutes and try again.");
  } catch (error) {
    logger.error("admin.login_ratelimit_unavailable", {}, error);
    return errorState("Sign-in is temporarily unavailable. Please try again shortly.");
  }

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    // One generic message for wrong password, unknown user and unconfirmed email.
    return errorState(GENERIC_FAILURE);
  }

  // A valid Auth account is not enough: it must also be an editorial profile.
  const editor = await getEditorContext();
  if (!editor) {
    await db.auth.signOut();
    return errorState(GENERIC_FAILURE);
  }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
