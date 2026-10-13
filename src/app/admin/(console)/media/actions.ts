"use server";

import { redirect } from "next/navigation";
import { errorState, formString, okState, type FormState } from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import {
  deleteMedia,
  ingestUpload,
  newIncomingPath,
  parseMediaMetadata,
  updateMediaMetadata,
} from "@/server/editorial/media";
import { invalidateMedia } from "@/server/editorial/revalidate";
import { logger } from "@/server/logger";

/**
 * Step 1 of an upload: hand the browser a one-time path inside `incoming/`.
 * The browser then uploads directly to Storage with the editor's own session
 * (so large files never pass through the app server body limit).
 */
export async function requestUploadPathAction(): Promise<{ path: string }> {
  await requireEditor();
  return { path: newIncomingPath() };
}

export type UploadResult =
  | { ok: true; asset: { id: string; url: string; alt: string } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Step 2: validate, normalise and register the uploaded file. */
export async function finalizeUploadAction(payload: {
  path: string;
  altText: string;
  caption: string;
  credit: string;
  licenseNote: string;
  sourceNote: string;
}): Promise<UploadResult> {
  const { db, userId } = await requireEditor();
  const metadata = parseMediaMetadata(payload);
  if (!metadata.ok) return { ok: false, error: metadata.error, fieldErrors: metadata.fieldErrors };

  try {
    const result = await ingestUpload(db, userId, String(payload.path ?? ""), metadata.data);
    if (!result.ok) return { ok: false, error: result.error };
    invalidateMedia();
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    return {
      ok: true,
      asset: {
        id: result.data.id,
        url: `${base}/storage/v1/object/public/editorial-media/${result.data.storagePath}`,
        alt: metadata.data.altText,
      },
    };
  } catch (error) {
    logger.error("admin.media_ingest_failed", {}, error);
    return { ok: false, error: "Something went wrong processing that image." };
  }
}

export async function updateMediaAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();
  const metadata = parseMediaMetadata({
    altText: formString(formData, "altText"),
    caption: formString(formData, "caption"),
    credit: formString(formData, "credit"),
    licenseNote: formString(formData, "licenseNote"),
    sourceNote: formString(formData, "sourceNote"),
  });
  if (!metadata.ok) return errorState(metadata.error, metadata.fieldErrors);

  const result = await updateMediaMetadata(db, userId, formString(formData, "id"), metadata.data);
  if (!result.ok) return errorState(result.error);
  invalidateMedia();
  return okState("Image details saved.");
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const { db, userId } = await requireEditor();
  const result = await deleteMedia(db, userId, formString(formData, "id"));
  if (!result.ok) redirect(`/admin/media?error=${encodeURIComponent(result.error)}`);
  invalidateMedia();
  redirect("/admin/media?deleted=1");
}
