"use server";

import { redirect } from "next/navigation";
import {
  errorState,
  formBool,
  formList,
  formString,
  type FormState,
} from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import { deleteContributor, parseContributorInput, saveContributor } from "@/server/editorial/directory";
import { invalidateContributor } from "@/server/editorial/revalidate";
import { logger } from "@/server/logger";

export async function saveContributorAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();

  const parsed = parseContributorInput({
    id: formString(formData, "id") || undefined,
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    descriptor: formString(formData, "descriptor"),
    bio: formString(formData, "bio"),
    avatarAssetId: formString(formData, "avatarAssetId"),
    coverAssetId: formString(formData, "coverAssetId"),
    expertise: formList(formData, "expertise"),
    websiteUrl: formString(formData, "websiteUrl"),
    socialUrl: formString(formData, "socialUrl"),
    profileVisible: formBool(formData, "profileVisible"),
    isHighlighted: formBool(formData, "isHighlighted"),
    email: formString(formData, "email"),
    notes: formString(formData, "notes"),
  });
  if (!parsed.ok) return errorState(parsed.error, parsed.fieldErrors);

  try {
    const previousSlug = formString(formData, "previousSlug");
    const result = await saveContributor(db, userId, parsed.data);
    if (!result.ok) return errorState(result.error, result.fieldErrors);
    invalidateContributor(result.data.slug);
    if (previousSlug && previousSlug !== result.data.slug) invalidateContributor(previousSlug);
  } catch (error) {
    logger.error("admin.contributor_save_failed", {}, error);
    return errorState("Something went wrong saving this contributor.");
  }
  redirect("/admin/contributors?saved=1");
}

export async function deleteContributorAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireEditor();
  const id = formString(formData, "id");
  const slug = formString(formData, "slug");
  const result = await deleteContributor(db, userId, id);
  if (!result.ok) redirect(`/admin/contributors?error=${encodeURIComponent(result.error)}`);
  invalidateContributor(slug);
  redirect("/admin/contributors?deleted=1");
}
