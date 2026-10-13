import "server-only";
import { randomUUID } from "node:crypto";
import { SUBMISSION_IMAGE_LIMITS } from "@/lib/validation/submission";
import { logger } from "@/server/logger";
import { ImageRejectedError, processImage, type ImageFormat, type ProcessedImage } from "@/server/media/process-image";
import type { Db } from "@/server/supabase/clients";

export const SUBMISSION_IMAGE_BUCKET = "submission-images";

const STORED_FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];

export type PreparedImages = { ok: true; images: ProcessedImage[] } | { ok: false; error: string };

/** Cheap checks on count and size that run before any file is read into memory. */
export function checkImageSizes(sizes: number[]): string | null {
  const L = SUBMISSION_IMAGE_LIMITS;
  if (sizes.length > L.maxCount) return `Please attach no more than ${L.maxCount} photos.`;
  if (sizes.some((size) => size === 0)) return "One of the photos is empty. Please choose it again.";
  if (sizes.some((size) => size > L.maxBytesEach) || sizes.reduce((sum, size) => sum + size, 0) > L.maxTotalBytes) {
    return "Those photos are too large to send. Please try fewer or smaller photos.";
  }
  return null;
}

/**
 * Validate and re-encode submitted photos. The file content decides the type,
 * never the name or the browser's claim; re-encoding strips EXIF metadata
 * (camera details and GPS location) before anything is stored.
 */
export async function prepareSubmissionImages(files: Buffer[]): Promise<PreparedImages> {
  const sizeError = checkImageSizes(files.map((file) => file.byteLength));
  if (sizeError) return { ok: false, error: sizeError };

  const images: ProcessedImage[] = [];
  for (const [index, file] of files.entries()) {
    const label = files.length > 1 ? `Photo ${index + 1}` : "The photo";
    try {
      images.push(await processImage(file, STORED_FORMATS));
    } catch (error) {
      if (error instanceof ImageRejectedError) return { ok: false, error: `${label}: ${error.message}` };
      throw error;
    }
  }
  return { ok: true, images };
}

/**
 * Store prepared photos for a saved submission. Each failure is logged and
 * counted rather than thrown: the written submission must never be lost
 * because a photo could not be stored.
 */
export async function storeSubmissionImages(
  db: Db,
  submissionId: string,
  images: ProcessedImage[],
): Promise<{ stored: number; failed: number }> {
  const bucket = db.storage.from(SUBMISSION_IMAGE_BUCKET);
  let stored = 0;
  for (const [position, image] of images.entries()) {
    const storagePath = `${submissionId}/${randomUUID()}.${image.ext}`;
    const { error: uploadError } = await bucket.upload(storagePath, image.buffer, {
      contentType: image.mime,
      upsert: false,
    });
    if (uploadError) {
      logger.error("submission.image_store_failed", { submissionId, position }, uploadError);
      continue;
    }
    const { error: insertError } = await db.from("submission_images").insert({
      submission_id: submissionId,
      storage_path: storagePath,
      mime_type: image.mime,
      byte_size: image.byteSize,
      width: image.width,
      height: image.height,
      position,
    });
    if (insertError) {
      logger.error("submission.image_record_failed", { submissionId, position, code: insertError.code }, insertError);
      await bucket.remove([storagePath]);
      continue;
    }
    stored += 1;
  }
  return { stored, failed: images.length - stored };
}
