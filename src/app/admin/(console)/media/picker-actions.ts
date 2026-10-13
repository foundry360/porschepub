"use server";

import { requireEditor } from "@/server/auth/session";
import { listMedia, MEDIA_PAGE_SIZE, type MediaListItem } from "@/server/editorial/media-queries";

/** Library search for the in-editor image picker. */
export async function listMediaAction(
  query: string,
  page: number,
): Promise<{ items: MediaListItem[]; hasMore: boolean }> {
  const { db } = await requireEditor();
  const safePage = Number.isFinite(page) ? Math.max(1, Math.min(200, Math.floor(page))) : 1;
  const { items, total } = await listMedia(db, { q: String(query ?? "").slice(0, 80), page: safePage });
  return { items, hasMore: safePage * MEDIA_PAGE_SIZE < total };
}
