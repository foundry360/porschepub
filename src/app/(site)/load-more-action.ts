"use server";

import type { StorySummary } from "@/lib/types";
import { listStories } from "@/server/content/public";

export type StoryScope = { categoryId?: string; tagId?: string; contributorId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE = 500;

/** Next page of published stories for "Load more". Reads only public, published content. */
export async function loadMoreStories(
  scope: StoryScope,
  page: number,
): Promise<{ items: StorySummary[]; page: number; totalPages: number }> {
  if (!Number.isInteger(page) || page < 2 || page > MAX_PAGE) return { items: [], page, totalPages: 0 };
  const ids = [scope.categoryId, scope.tagId, scope.contributorId];
  if (ids.some((id) => id !== undefined && (typeof id !== "string" || !UUID.test(id)))) {
    return { items: [], page, totalPages: 0 };
  }
  const result = await listStories({
    page,
    categoryId: scope.categoryId,
    tagId: scope.tagId,
    contributorId: scope.contributorId,
  });
  return { items: result.items, page: result.page, totalPages: result.totalPages };
}
