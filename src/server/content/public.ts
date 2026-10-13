import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { brand } from "@/config/brand";
import { homepage, pagination } from "@/config/site";
import { collectImageAssetIds } from "@/lib/content/blocks";
import { toMediaImage, type MediaAssetRow } from "@/lib/media";
import type {
  CategorySummary,
  ContributorProfile,
  ContributorSummary,
  HomepageData,
  PageContent,
  Paginated,
  StoryDetail,
  StorySummary,
  TagSummary,
} from "@/lib/types";
import { createPublicClient } from "@/server/supabase/clients";
import { loadStoryDetail } from "./story-query";
import {
  CATEGORY_SELECT,
  CONTRIBUTOR_SELECT,
  imageMapFromRows,
  MEDIA_COLUMNS,
  parseBlocks,
  STORY_SUMMARY_SELECT,
  toCategory,
  toContributorSummary,
  toStorySummary,
  type StoryRow,
} from "./mappers";

/**
 * PUBLIC content reads.
 *
 * Every function here uses the anonymous Supabase client, so Row Level
 * Security guarantees that only live content can ever be returned, even if the
 * query below were wrong. Results are cached with tags that editorial actions
 * invalidate (see `src/server/editorial/revalidate.ts`).
 */

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`Content query failed (${context}): ${error?.message ?? "unknown error"}`);
}

function pageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function paginated<T>(items: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// -- Stories --------------------------------------------------------------------

export type StoryListFilter = {
  page: number;
  categoryId?: string;
  tagId?: string;
  contributorId?: string;
  pageSize?: number;
};

export async function listStories(filter: StoryListFilter): Promise<Paginated<StorySummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("stories");

  const pageSize = filter.pageSize ?? pagination.storiesPerPage;
  const { from, to } = pageRange(filter.page, pageSize);
  const db = createPublicClient();

  const select = filter.tagId
    ? `${STORY_SUMMARY_SELECT}, story_tags!inner(tag_id)`
    : STORY_SUMMARY_SELECT;

  let query = db
    .from("stories")
    .select(select, { count: "exact" })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter.contributorId) query = query.eq("contributor_id", filter.contributorId);
  if (filter.tagId) query = query.eq("story_tags.tag_id", filter.tagId);

  const { data, error, count } = await query;
  // Requesting a page past the end yields a 416 from PostgREST: treat as empty.
  if (error && !/range|416|PGRST103/i.test(`${error.code ?? ""} ${error.message}`)) {
    fail("listStories", error);
  }
  const rows = (data ?? []) as unknown as StoryRow[];
  return paginated(rows.map(toStorySummary), filter.page, pageSize, count ?? 0);
}

export async function getStoryBySlug(slug: string): Promise<StoryDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories", `story:${slug}`);

  return loadStoryDetail(createPublicClient(), { slug });
}

/** If `slug` belonged to a live story that was renamed, return its current slug. */
export async function findStoryRedirect(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories", `story:${slug}`);

  const db = createPublicClient();
  const { data: history, error } = await db
    .from("story_slug_history")
    .select("story_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("findStoryRedirect", error);
  if (!history) return null;

  const { data: story, error: storyError } = await db
    .from("stories")
    .select("slug")
    .eq("id", history.story_id)
    .maybeSingle();
  if (storyError) fail("findStoryRedirect.story", storyError);
  return story && story.slug !== slug ? story.slug : null;
}

export async function getRelatedStories(
  storyId: string,
  categoryId: string | null,
  limit = 3,
): Promise<StorySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories");

  const db = createPublicClient();

  const { data: curated, error: curatedError } = await db
    .from("related_stories")
    .select(`position, related:stories!related_story_id(${STORY_SUMMARY_SELECT})`)
    .eq("story_id", storyId)
    .order("position", { ascending: true })
    .limit(limit);
  if (curatedError) fail("getRelatedStories.curated", curatedError);

  const results: StorySummary[] = [];
  const seen = new Set<string>([storyId]);
  for (const entry of (curated ?? []) as unknown as Array<{ related: StoryRow | null }>) {
    if (entry.related && !seen.has(entry.related.id)) {
      seen.add(entry.related.id);
      results.push(toStorySummary(entry.related));
    }
  }

  if (results.length < limit && categoryId) {
    const { data: fallback, error } = await db
      .from("stories")
      .select(STORY_SUMMARY_SELECT)
      .eq("category_id", categoryId)
      .neq("id", storyId)
      .order("published_at", { ascending: false })
      .limit(limit + results.length);
    if (error) fail("getRelatedStories.fallback", error);
    for (const row of (fallback ?? []) as unknown as StoryRow[]) {
      if (results.length >= limit) break;
      if (!seen.has(row.id)) {
        seen.add(row.id);
        results.push(toStorySummary(row));
      }
    }
  }
  return results;
}

/** Slugs of live stories, newest first. Used by static params, sitemap and feed. */
export async function listLiveStoryIndex(
  limit: number,
): Promise<Array<{ slug: string; publishedAt: string; updatedAt: string; imageUrl: string | null }>> {
  "use cache";
  cacheLife("hours");
  cacheTag("stories");

  const db = createPublicClient();
  const { data, error } = await db
    .from("stories")
    .select(`slug, published_at, updated_at, lead_image:media_assets!lead_image_id(${MEDIA_COLUMNS})`)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) fail("listLiveStoryIndex", error);
  return ((data ?? []) as unknown as Array<{
    slug: string;
    published_at: string;
    updated_at: string;
    lead_image: MediaAssetRow | null;
  }>).map((row) => ({
    slug: row.slug,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    imageUrl: toMediaImage(row.lead_image)?.url ?? null,
  }));
}

export async function searchStories(query: string, page: number): Promise<Paginated<StorySummary>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("stories");

  const pageSize = pagination.searchPerPage;
  const db = createPublicClient();
  const { data: hits, error } = await db.rpc("search_stories", {
    p_query: query,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) fail("searchStories", error);

  const ranked = hits ?? [];
  const total = ranked.length > 0 ? Number(ranked[0].total_count) : 0;
  if (ranked.length === 0) return paginated([], page, pageSize, total);

  const ids = ranked.map((hit) => hit.id);
  const { data: rows, error: storiesError } = await db
    .from("stories")
    .select(STORY_SUMMARY_SELECT)
    .in("id", ids);
  if (storiesError) fail("searchStories.stories", storiesError);

  const byId = new Map(((rows ?? []) as unknown as StoryRow[]).map((row) => [row.id, row]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((row): row is StoryRow => Boolean(row))
    .map(toStorySummary);
  return paginated(ordered, page, pageSize, total);
}

// -- Taxonomy --------------------------------------------------------------------

export async function listCategories(): Promise<CategorySummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const db = createPublicClient();
  const { data, error } = await db
    .from("categories")
    .select(CATEGORY_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) fail("listCategories", error);
  return (data ?? []).map((row) => toCategory(row) as CategorySummary);
}

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const db = createPublicClient();
  const { data, error } = await db
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("getCategoryBySlug", error);
  return toCategory(data);
}

export async function getTagBySlug(slug: string): Promise<TagSummary | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("tags");

  const db = createPublicClient();
  const { data, error } = await db.from("tags").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (error) fail("getTagBySlug", error);
  return data;
}

// -- Contributors ------------------------------------------------------------------

export async function getContributorBySlug(slug: string): Promise<ContributorProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("contributors", `contributor:${slug}`);

  const db = createPublicClient();
  const { data, error } = await db
    .from("contributors")
    .select(
      `${CONTRIBUTOR_SELECT}, bio, expertise, website_url, social_url, updated_at`,
    )
    .eq("slug", slug)
    .eq("profile_visible", true)
    .maybeSingle();
  if (error) fail("getContributorBySlug", error);
  if (!data) return null;

  const row = data as unknown as Parameters<typeof toContributorSummary>[0] & {
    bio: string | null;
    expertise: string[];
    website_url: string | null;
    social_url: string | null;
    updated_at: string;
  };
  const summary = toContributorSummary(row);
  if (!summary) return null;
  return {
    ...summary,
    bio: row.bio,
    expertise: row.expertise,
    websiteUrl: row.website_url,
    socialUrl: row.social_url,
    updatedAt: row.updated_at,
  };
}

export async function listContributors(page: number): Promise<Paginated<ContributorSummary>> {
  "use cache";
  cacheLife("hours");
  cacheTag("contributors");

  const pageSize = pagination.contributorsPerPage;
  const { from, to } = pageRange(page, pageSize);
  const db = createPublicClient();
  const { data, error, count } = await db
    .from("contributors")
    .select(CONTRIBUTOR_SELECT, { count: "exact" })
    .eq("profile_visible", true)
    .order("name", { ascending: true })
    .range(from, to);
  if (error && !/range|416|PGRST103/i.test(`${error.code ?? ""} ${error.message}`)) {
    fail("listContributors", error);
  }
  const items = ((data ?? []) as unknown as Array<Parameters<typeof toContributorSummary>[0]>)
    .map(toContributorSummary)
    .filter((item): item is ContributorSummary => Boolean(item));
  return paginated(items, page, pageSize, count ?? 0);
}

export async function listProfileContributorSlugs(limit: number): Promise<Array<{ slug: string; updatedAt: string }>> {
  "use cache";
  cacheLife("hours");
  cacheTag("contributors");

  const db = createPublicClient();
  const { data, error } = await db
    .from("contributors")
    .select("slug, updated_at")
    .eq("profile_visible", true)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) fail("listProfileContributorSlugs", error);
  return (data ?? []).map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}

// -- Pages & settings ------------------------------------------------------------------

export async function getPage(slug: string): Promise<PageContent | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages", `page:${slug}`);

  const db = createPublicClient();
  const { data, error } = await db
    .from("pages")
    .select("id, slug, kind, title, summary, body, legal_reviewed, seo_title, seo_description, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("getPage", error);
  if (!data) return null;

  const blocks = parseBlocks(data.body);
  const assetIds = collectImageAssetIds(blocks);
  let images = {};
  if (assetIds.length > 0) {
    const { data: assets, error: assetError } = await db
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .in("id", assetIds);
    if (assetError) fail("getPage.assets", assetError);
    images = imageMapFromRows((assets ?? []) as unknown as MediaAssetRow[]);
  }

  return {
    id: data.id,
    slug: data.slug,
    kind: data.kind as PageContent["kind"],
    title: data.title,
    summary: data.summary,
    blocks,
    images,
    legalReviewed: data.legal_reviewed,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    updatedAt: data.updated_at,
  };
}

async function readHeroSetting(): Promise<Partial<HomepageData["hero"]>> {
  const db = createPublicClient();
  const { data, error } = await db.from("site_settings").select("value").eq("key", "home.hero").maybeSingle();
  if (error) fail("readHeroSetting", error);
  const value = data?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const pick = (key: string) =>
    typeof record[key] === "string" && (record[key] as string).trim() ? (record[key] as string).trim() : undefined;
  return { kicker: pick("kicker"), headline: pick("headline"), intro: pick("intro") };
}

// -- Homepage -----------------------------------------------------------------------------

/**
 * Homepage composition with explicit fallbacks:
 *   featured  -> editor-selected story, else the newest live story
 *   picks     -> editor-selected stories (ordered), topped up with stories left over after latest
 *   latest    -> newest stories other than the featured story and editor-selected picks
 */
export async function getHomepage(): Promise<HomepageData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("homepage", "stories", "categories", "contributors");

  const db = createPublicClient();
  const heroSetting = await readHeroSetting();

  const { data: placements, error: placementError } = await db
    .from("homepage_placements")
    .select(`section, position, story:stories!story_id(${STORY_SUMMARY_SELECT})`)
    .order("position", { ascending: true });
  if (placementError) fail("getHomepage.placements", placementError);

  type Placement = { section: string; position: number; story: StoryRow | null };
  const rows = (placements ?? []) as unknown as Placement[];
  const featuredRow = rows.find((row) => row.section === "featured" && row.story)?.story ?? null;
  const pickRows = rows
    .filter((row) => row.section === "editors_picks" && row.story)
    .map((row) => row.story as StoryRow)
    .slice(0, homepage.editorsPicksCount);

  const { data: recent, error: recentError } = await db
    .from("stories")
    .select(STORY_SUMMARY_SELECT)
    .order("published_at", { ascending: false })
    .limit(homepage.latestCount + homepage.editorsPicksCount + 1);
  if (recentError) fail("getHomepage.recent", recentError);
  const recentStories = ((recent ?? []) as unknown as StoryRow[]).map(toStorySummary);

  const used = new Set<string>();
  const featured = featuredRow ? toStorySummary(featuredRow) : (recentStories[0] ?? null);
  if (featured) used.add(featured.id);

  const picks: StorySummary[] = [];
  for (const row of pickRows) {
    if (!used.has(row.id)) {
      picks.push(toStorySummary(row));
      used.add(row.id);
    }
  }
  const latest = recentStories.filter((story) => !used.has(story.id)).slice(0, homepage.latestCount);
  latest.forEach((story) => used.add(story.id));

  for (const story of recentStories) {
    if (picks.length >= homepage.editorsPicksCount) break;
    if (!used.has(story.id)) {
      picks.push(story);
      used.add(story.id);
    }
  }

  const { data: categoryRows, error: categoryError } = await db
    .from("categories")
    .select(CATEGORY_SELECT)
    .order("sort_order", { ascending: true });
  if (categoryError) fail("getHomepage.categories", categoryError);
  const categories = (categoryRows ?? []).map((row) => toCategory(row) as CategorySummary);

  const { data: contributorRows, error: contributorError } = await db
    .from("contributors")
    .select(CONTRIBUTOR_SELECT)
    .eq("profile_visible", true)
    .eq("is_highlighted", true)
    .order("updated_at", { ascending: false })
    .limit(homepage.contributorHighlights);
  if (contributorError) fail("getHomepage.contributors", contributorError);
  const contributors = ((contributorRows ?? []) as unknown as Array<Parameters<typeof toContributorSummary>[0]>)
    .map(toContributorSummary)
    .filter((item): item is ContributorSummary => Boolean(item));

  return {
    hero: {
      kicker: heroSetting.kicker ?? brand.heroDefaults.kicker,
      headline: heroSetting.headline ?? brand.heroDefaults.headline,
      intro: heroSetting.intro ?? brand.heroDefaults.intro,
    },
    featured,
    editorsPicks: picks,
    latest,
    contributors,
    categories,
  };
}
