import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/server/db/database.types";
import { getSupabasePublicConfig, getSupabaseSecretKey } from "@/server/env";

export type Db = SupabaseClient<Database>;

/**
 * Anonymous client with no session. Used for all PUBLIC reads so that Row Level
 * Security (not application code) is what decides that only live content is
 * visible. Safe to call inside `use cache` scopes because it never touches
 * cookies.
 */
export function createPublicClient(): Db {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Client acting as the signed-in editor (reads the auth cookie). Only for
 * request-time admin code; never call inside `use cache`.
 */
export async function createSessionClient(): Promise<Db> {
  const { url, publishableKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only. The
          // proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Privileged client that bypasses RLS. Restricted to a short list of server
 * code paths (public submission insert, rate limiting, admin provisioning).
 * Every use must be justified in review.
 */
export function createServiceClient(): Db {
  const { url } = getSupabasePublicConfig();
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
