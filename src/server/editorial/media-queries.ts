import "server-only";
import { mediaPublicUrl } from "@/lib/media";
import type { Db } from "@/server/supabase/clients";

export type MediaListItem = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: string | null;
  createdAt: string;
};

export const MEDIA_PAGE_SIZE = 24;

export async function listMedia(
  db: Db,
  opts: { q?: string; page?: number },
): Promise<{ items: MediaListItem[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  let query = db
    .from("media_assets")
    .select("id, bucket, storage_path, width, height, alt_text, caption, credit, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * MEDIA_PAGE_SIZE, page * MEDIA_PAGE_SIZE - 1);

  const term = (opts.q ?? "").replace(/[%_,()\\*"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (term) query = query.or(`alt_text.ilike.%${term}%,caption.ilike.%${term}%,credit.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(`Media list failed: ${error.message}`);
  return {
    total: count ?? 0,
    items: (data ?? []).map((row) => ({
      id: row.id,
      url: mediaPublicUrl(row.bucket, row.storage_path),
      width: row.width,
      height: row.height,
      alt: row.alt_text,
      caption: row.caption,
      credit: row.credit,
      createdAt: row.created_at,
    })),
  };
}

/** Resolve a set of asset ids to display info (for editors showing selected images). */
export async function getMediaByIds(db: Db, ids: string[]): Promise<Record<string, MediaListItem>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data, error } = await db
    .from("media_assets")
    .select("id, bucket, storage_path, width, height, alt_text, caption, credit, created_at")
    .in("id", unique);
  if (error) throw new Error(`Media lookup failed: ${error.message}`);
  const out: Record<string, MediaListItem> = {};
  for (const row of data ?? []) {
    out[row.id] = {
      id: row.id,
      url: mediaPublicUrl(row.bucket, row.storage_path),
      width: row.width,
      height: row.height,
      alt: row.alt_text,
      caption: row.caption,
      credit: row.credit,
      createdAt: row.created_at,
    };
  }
  return out;
}
