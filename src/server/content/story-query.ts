import "server-only";
import { collectImageAssetIds } from "@/lib/content/blocks";
import { toMediaImage, type MediaAssetRow } from "@/lib/media";
import type { StoryDetail, TagSummary } from "@/lib/types";
import type { Db } from "@/server/supabase/clients";
import {
  imageMapFromRows,
  MEDIA_COLUMNS,
  parseBlocks,
  STORY_SUMMARY_SELECT,
  toStorySummary,
  type StoryRow,
} from "./mappers";

/**
 * Load a full story with its images and tags using whatever client is passed:
 *  - anon client  -> only live stories can ever be returned (RLS)
 *  - editor client -> drafts are returned too (used by authenticated preview)
 * This function itself performs NO authorization; callers choose the client.
 */
export async function loadStoryDetail(
  db: Db,
  by: { slug: string } | { id: string },
): Promise<StoryDetail | null> {
  let query = db
    .from("stories")
    .select(
      `${STORY_SUMMARY_SELECT}, body, seo_title, seo_description, canonical_url_override, updated_at, status,
       og_image:media_assets!og_image_id(${MEDIA_COLUMNS}),
       story_tags(tag:tags(id, slug, name))`,
    );
  query = "slug" in by ? query.eq("slug", by.slug) : query.eq("id", by.id);
  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(`Content query failed (loadStoryDetail): ${error.message}`);
  if (!data) return null;

  const row = data as unknown as StoryRow & {
    body: unknown;
    seo_title: string | null;
    seo_description: string | null;
    canonical_url_override: string | null;
    updated_at: string;
    status: "draft" | "published" | "archived";
    og_image: MediaAssetRow | null;
    story_tags: Array<{ tag: TagSummary | null }>;
  };

  const blocks = parseBlocks(row.body);
  const assetIds = collectImageAssetIds(blocks);
  let images = {};
  if (assetIds.length > 0) {
    const { data: assets, error: assetError } = await db
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .in("id", assetIds);
    if (assetError) throw new Error(`Content query failed (loadStoryDetail.assets): ${assetError.message}`);
    images = imageMapFromRows((assets ?? []) as unknown as MediaAssetRow[]);
  }

  return {
    ...toStorySummary(row),
    blocks,
    images,
    tags: row.story_tags.map((entry) => entry.tag).filter((tag): tag is TagSummary => Boolean(tag)),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrlOverride: row.canonical_url_override,
    ogImage: toMediaImage(row.og_image),
    updatedAt: row.updated_at,
    status: row.status,
  };
}
