"use server";

import { errorState, formBool, formString, okState, type FormState } from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import { invalidatePage } from "@/server/editorial/revalidate";
import { parsePageInput, savePage } from "@/server/editorial/site";
import { logger } from "@/server/logger";

export async function savePageAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();

  let bodyRaw: unknown;
  try {
    bodyRaw = JSON.parse(formString(formData, "body") || "[]");
  } catch {
    return errorState("The page body isn’t valid.", { body: "The content could not be read. Reload and try again." });
  }

  const parsed = parsePageInput({
    id: formString(formData, "id"),
    title: formString(formData, "title"),
    summary: formString(formData, "summary"),
    body: bodyRaw,
    legalReviewed: formBool(formData, "legalReviewed"),
    isPublished: formBool(formData, "isPublished"),
    seoTitle: formString(formData, "seoTitle"),
    seoDescription: formString(formData, "seoDescription"),
  });
  if (!parsed.ok) return errorState(parsed.error, parsed.fieldErrors);

  try {
    const result = await savePage(db, userId, parsed.data);
    if (!result.ok) return errorState(result.error, result.fieldErrors);
    invalidatePage(result.data.slug);
    return okState("Page saved.", { slug: result.data.slug });
  } catch (error) {
    logger.error("admin.page_save_failed", {}, error);
    return errorState("Something went wrong saving this page.");
  }
}
