import "server-only";
import { parseBodyForRender, type Block } from "@/lib/content/blocks";
import { MEDIA_COLUMNS, toMediaImage, type MediaAssetRow } from "@/lib/media";
import type {
  CategorySummary,
  ContributorSummary,
  MediaImage,
  StorySummary,
} from "@/lib/types";

export { MEDIA_COLUMNS };

type CategoryRow = { id: string; slug: string; name: string; description: string | null };
type ContributorRow = {
  id: string;
  slug: string;
  name: string;
  descriptor: string | null;
  profile_visible: boolean;
  avatar: MediaAssetRow | null;
};

export type StoryRow = {
  id: string;
  slug: string;
  format: string;
  headline: string;
  subtitle: string | null;
  summary: string | null;
  reading_minutes: number;
  published_at: string;
  category: CategoryRow | null;
  contributor: ContributorRow | null;
  lead_image: MediaAssetRow | null;
};

/** Embedded-select fragments (kept in one place so list/detail stay in sync). */
export const CATEGORY_SELECT = "id, slug, name, description";
export const CONTRIBUTOR_SELECT = `id, slug, name, descriptor, profile_visible, avatar:media_assets!avatar_asset_id(${MEDIA_COLUMNS})`;
export const STORY_SUMMARY_SELECT = `id, slug, format, headline, subtitle, summary, reading_minutes, published_at,
  category:categories(${CATEGORY_SELECT}),
  contributor:contributors(${CONTRIBUTOR_SELECT}),
  lead_image:media_assets!lead_image_id(${MEDIA_COLUMNS})`;

export function toCategory(row: CategoryRow | null): CategorySummary | null {
  return row ? { id: row.id, slug: row.slug, name: row.name, description: row.description } : null;
}

export function toContributorSummary(row: ContributorRow | null): ContributorSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    descriptor: row.descriptor,
    hasProfile: row.profile_visible,
    avatar: toMediaImage(row.avatar),
  };
}

export function toStorySummary(row: StoryRow): StorySummary {
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    subtitle: row.subtitle,
    summary: row.summary,
    format: row.format,
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at,
    category: toCategory(row.category),
    contributor: toContributorSummary(row.contributor),
    leadImage: toMediaImage(row.lead_image),
  };
}

/** Resolve the image blocks of a body into display-ready images, keyed by asset id. */
export function imageMapFromRows(rows: MediaAssetRow[]): Record<string, MediaImage> {
  const map: Record<string, MediaImage> = {};
  for (const row of rows) {
    const image = toMediaImage(row);
    if (image) map[row.id] = image;
  }
  return map;
}

export function parseBlocks(raw: unknown): Block[] {
  return parseBodyForRender(raw).blocks;
}
