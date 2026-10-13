import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Db } from "@/server/supabase/clients";
import { createSessionClient } from "@/server/supabase/clients";

export type EditorialRole = "admin" | "editor";

export type EditorContext = {
  db: Db;
  userId: string;
  email: string;
  displayName: string;
  role: EditorialRole;
};

/**
 * Resolve the current editorial user, or null.
 *
 * `getUser()` validates the JWT with the Auth server on every call (we never
 * trust the cookie alone), and the role is read from `profiles`, which only
 * contains people an administrator deliberately added. An authenticated user
 * without a profile row is NOT an editor.
 */
export async function getEditorContext(): Promise<EditorContext | null> {
  // Authenticated work is always request-time. This also keeps clock reads inside
  // the auth client (token expiry checks) out of the prerender phase.
  await connection();
  const db = await createSessionClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    db,
    userId: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
    role: profile.role,
  };
}

/** For pages and actions: redirects anonymous or non-editorial users to login. */
export async function requireEditor(): Promise<EditorContext> {
  const context = await getEditorContext();
  if (!context) redirect("/admin/login");
  return context;
}

/** Administrator-only operations (team, audit log, hard deletes). */
export async function requireAdmin(): Promise<EditorContext> {
  const context = await requireEditor();
  if (context.role !== "admin") redirect("/admin?denied=1");
  return context;
}
