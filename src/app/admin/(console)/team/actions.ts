"use server";

import { redirect } from "next/navigation";
import { formString } from "@/lib/editorial/form-state";
import { requireAdmin } from "@/server/auth/session";
import { removeEditor, setEditorRole } from "@/server/editorial/team";

export async function changeRoleAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireAdmin();
  const role = formString(formData, "role") === "admin" ? "admin" : "editor";
  const result = await setEditorRole(db, userId, formString(formData, "id"), role);
  redirect(result.ok ? "/admin/team?saved=1" : `/admin/team?error=${encodeURIComponent(result.error)}`);
}

export async function removeEditorAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireAdmin();
  const result = await removeEditor(db, userId, formString(formData, "id"));
  redirect(result.ok ? "/admin/team?saved=1" : `/admin/team?error=${encodeURIComponent(result.error)}`);
}
