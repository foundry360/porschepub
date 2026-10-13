import "server-only";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

/**
 * Change an editorial role. Guards: you can't change your own role, and the
 * last administrator can never be demoted. Authorization itself is enforced by
 * RLS (admin-only writes on profiles).
 */
export async function setEditorRole(
  db: Db,
  actorId: string,
  targetId: string,
  role: "admin" | "editor",
): Promise<Result<true>> {
  if (targetId === actorId) return fail("You can’t change your own role. Ask another administrator.");

  const { data: target, error } = await db.from("profiles").select("id, role").eq("id", targetId).maybeSingle();
  if (error) return fail(describeDbError(error));
  if (!target) return fail("That person could not be found.");
  if (target.role === role) return ok(true);

  if (target.role === "admin" && role !== "admin") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return fail("There must always be at least one administrator.");
  }

  const { data, error: updateError } = await db.from("profiles").update({ role }).eq("id", targetId).select("id");
  if (updateError) return fail(describeDbError(updateError));
  if (!data || data.length === 0) return fail("Only administrators can change roles.");
  await writeAudit(db, actorId, "team.role_changed", "profile", targetId, { from: target.role, to: role });
  return ok(true);
}

/**
 * Revoke editorial access by removing the profile. The Auth account remains
 * (and can be deleted in the Supabase dashboard) but grants nothing.
 */
export async function removeEditor(db: Db, actorId: string, targetId: string): Promise<Result<true>> {
  if (targetId === actorId) return fail("You can’t remove your own access.");
  const { data: target } = await db.from("profiles").select("id, role").eq("id", targetId).maybeSingle();
  if (!target) return fail("That person could not be found.");
  if (target.role === "admin") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return fail("There must always be at least one administrator.");
  }
  const { data, error } = await db.from("profiles").delete().eq("id", targetId).select("id");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("Only administrators can remove access.");
  await writeAudit(db, actorId, "team.access_removed", "profile", targetId, { role: target.role });
  return ok(true);
}
