import type { MediaImage } from "@/lib/types";

/**
 * Public delivery URL for an object in the public editorial media bucket.
 * Works on server and client because it only needs the public project URL.
 */
export function mediaPublicUrl(bucket: string, storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export type MediaAssetRow = {
  id: string;
  bucket: string;
  storage_path: string;
  width: number;
  height: number;
  alt_text: string;
  caption: string | null;
  credit: string | null;
};

export function toMediaImage(row: MediaAssetRow | null | undefined): MediaImage | null {
  if (!row) return null;
  return {
    id: row.id,
    url: mediaPublicUrl(row.bucket, row.storage_path),
    width: row.width,
    height: row.height,
    alt: row.alt_text,
    caption: row.caption,
    credit: row.credit,
  };
}

export const MEDIA_COLUMNS =
  "id, bucket, storage_path, width, height, alt_text, caption, credit" as const;
