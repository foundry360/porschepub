"use server";

import { redirect } from "next/navigation";
import { errorState, formString, okState, type FormState } from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import {
  deleteCategory,
  deleteTag,
  parseCategoryInput,
  renameTag,
  saveCategory,
} from "@/server/editorial/directory";
import { invalidateTaxonomy } from "@/server/editorial/revalidate";
import { logger } from "@/server/logger";

export async function saveCategoryAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();
  const parsed = parseCategoryInput({
    id: formString(formData, "id") || undefined,
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    description: formString(formData, "description"),
    sortOrder: formString(formData, "sortOrder") || "0",
  });
  if (!parsed.ok) return errorState(parsed.error, parsed.fieldErrors);

  try {
    const result = await saveCategory(db, userId, parsed.data);
    if (!result.ok) return errorState(result.error, result.fieldErrors);
    invalidateTaxonomy();
    return okState(parsed.data.id ? "Category updated." : "Category created.", result.data);
  } catch (error) {
    logger.error("admin.category_save_failed", {}, error);
    return errorState("Something went wrong saving this category.");
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireEditor();
  const result = await deleteCategory(db, userId, formString(formData, "id"));
  if (!result.ok) redirect(`/admin/taxonomy?error=${encodeURIComponent(result.error)}`);
  invalidateTaxonomy();
  redirect("/admin/taxonomy?deleted=1");
}

export async function renameTagAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();
  const result = await renameTag(db, userId, formString(formData, "id"), formString(formData, "name"));
  if (!result.ok) return errorState(result.error);
  invalidateTaxonomy();
  return okState("Tag renamed.");
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireEditor();
  const result = await deleteTag(db, userId, formString(formData, "id"));
  if (!result.ok) redirect(`/admin/taxonomy?error=${encodeURIComponent(result.error)}`);
  invalidateTaxonomy();
  redirect("/admin/taxonomy?deleted=1");
}
