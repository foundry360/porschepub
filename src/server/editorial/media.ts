import "server-only";
import { randomUUID } from "node:crypto";
import {
  flattenIssues,
  mediaMetadataSchema,
  type MediaMetadataInput,
} from "@/lib/editorial/schemas";
import { logger } from "@/server/logger";
import { ImageRejectedError, processImage } from "@/server/media/process-image";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

export const MEDIA_BUCKET = "editorial-media";
const INCOMING_PREFIX = "incoming/";

export function parseMediaMetadata(raw: unknown): Result<MediaMetadataInput> {
  const parsed = mediaMetadataSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

/** Path the browser is allowed to upload raw files to (checked again on ingest). */
export function newIncomingPath(): string {
  return `${INCOMING_PREFIX}${randomUUID()}`;
}

const INCOMING_PATH = /^incoming\/[0-9a-f-]{36}$/;

/**
 * Turn a raw browser upload into a published-quality asset:
 * download -> validate/normalise (sharp) -> store under a dated path -> record
 * metadata -> remove the raw upload. Uses the editor's session client so
 * storage and table RLS both apply.
 */
export async function ingestUpload(
  db: Db,
  actorId: string,
  incomingPath: string,
  metadata: MediaMetadataInput,
): Promise<Result<{ id: string; storagePath: string }>> {
  if (!INCOMING_PATH.test(incomingPath)) return fail("Invalid upload reference.");

  const bucket = db.storage.from(MEDIA_BUCKET);
  const { data: blob, error: downloadError } = await bucket.download(incomingPath);
  if (downloadError || !blob) return fail("The uploaded file could not be found. Please try again.");

  let processed;
  try {
    processed = await processImage(Buffer.from(await blob.arrayBuffer()));
  } catch (error) {
    await bucket.remove([incomingPath]);
    if (error instanceof ImageRejectedError) return fail(error.message);
    logger.error("media.process_failed", {}, error);
    return fail("That image could not be processed.");
  }

  const now = new Date();
  const storagePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${processed.ext}`;

  const { error: uploadError } = await bucket.upload(storagePath, processed.buffer, {
    contentType: processed.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    await bucket.remove([incomingPath]);
    logger.error("media.store_failed", {}, uploadError);
    return fail("The image could not be stored. Please try again.");
  }
  await bucket.remove([incomingPath]);

  const { data: asset, error: insertError } = await db
    .from("media_assets")
    .insert({
      bucket: MEDIA_BUCKET,
      storage_path: storagePath,
      mime_type: processed.mime,
      byte_size: processed.byteSize,
      width: processed.width,
      height: processed.height,
      alt_text: metadata.altText,
      caption: metadata.caption,
      credit: metadata.credit,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (insertError || !asset) {
    await bucket.remove([storagePath]);
    return fail(describeDbError(insertError));
  }

  if (metadata.licenseNote || metadata.sourceNote) {
    await db
      .from("media_asset_private")
      .upsert({ asset_id: asset.id, license_note: metadata.licenseNote, source_note: metadata.sourceNote });
  }
  await writeAudit(db, actorId, "media.uploaded", "media_asset", asset.id, {
    bytes: processed.byteSize,
    width: processed.width,
    height: processed.height,
  });
  return ok({ id: asset.id, storagePath });
}

export async function updateMediaMetadata(
  db: Db,
  actorId: string,
  id: string,
  metadata: MediaMetadataInput,
): Promise<Result<true>> {
  const { data, error } = await db
    .from("media_assets")
    .update({ alt_text: metadata.altText, caption: metadata.caption, credit: metadata.credit })
    .eq("id", id)
    .select("id");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("That image could not be found.");

  const { error: privateError } = await db.from("media_asset_private").upsert({
    asset_id: id,
    license_note: metadata.licenseNote,
    source_note: metadata.sourceNote,
    updated_at: new Date().toISOString(),
  });
  if (privateError) return fail(describeDbError(privateError));
  await writeAudit(db, actorId, "media.updated", "media_asset", id, {});
  return ok(true);
}

/** Refuses to delete images that are still referenced by any story. */
export async function deleteMedia(db: Db, actorId: string, id: string): Promise<Result<true>> {
  const { data: asset, error: readError } = await db
    .from("media_assets")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (readError) return fail(describeDbError(readError));
  if (!asset) return fail("That image could not be found.");

  const usage = await mediaUsage(db, id);
  if (usage.length > 0) {
    return fail(`This image is still used by: ${usage.map((u) => u.label).join(", ")}. Replace it there first.`);
  }

  const { data, error } = await db.from("media_assets").delete().eq("id", id).select("id");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("Only administrators can delete images.");

  await db.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
  await writeAudit(db, actorId, "media.deleted", "media_asset", id, {});
  return ok(true);
}

export type MediaUsage = { kind: "story" | "contributor"; id: string; label: string };

/** Where an asset is referenced (lead, social image, avatar, contributor cover or inline in a body). */
export async function mediaUsage(db: Db, assetId: string): Promise<MediaUsage[]> {
  const usage: MediaUsage[] = [];
  const [lead, og, avatars, inline] = await Promise.all([
    db.from("stories").select("id, headline").eq("lead_image_id", assetId),
    db.from("stories").select("id, headline").eq("og_image_id", assetId),
    db.from("contributors").select("id, name").or(`avatar_asset_id.eq.${assetId},cover_asset_id.eq.${assetId}`),
    // Inline images live inside the JSON body; match on the asset id string.
    db.from("stories").select("id, headline").filter("body", "cs", JSON.stringify([{ type: "image", assetId }])),
  ]);
  const seen = new Set<string>();
  for (const row of [...(lead.data ?? []), ...(og.data ?? []), ...(inline.data ?? [])]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      usage.push({ kind: "story", id: row.id, label: row.headline });
    }
  }
  for (const row of avatars.data ?? []) usage.push({ kind: "contributor", id: row.id, label: row.name });
  return usage;
}
