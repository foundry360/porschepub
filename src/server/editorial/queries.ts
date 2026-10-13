import "server-only";
import { storyLifecycle, type StoryLifecycle } from "@/lib/workflow";
import type { Db } from "@/server/supabase/clients";

export type AdminStoryRow = {
  id: string;
  slug: string;
  headline: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  updatedAt: string;
  lifecycle: StoryLifecycle;
  contributorName: string | null;
  categoryName: string | null;
};

export const ADMIN_PAGE_SIZE = 25;

export type StoryFilter = "all" | StoryLifecycle;

/** Strip characters that have meaning inside PostgREST `or()` filters / LIKE. */
function safeSearch(q: string): string {
  return q.replace(/[%_,()\\*"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listAdminStories(
  db: Db,
  opts: { filter: StoryFilter; q: string; page: number },
): Promise<{ rows: AdminStoryRow[]; total: number }> {
  let query = db
    .from("stories")
    .select(
      "id, slug, headline, status, published_at, updated_at, contributor:contributors(name), category:categories(name)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((opts.page - 1) * ADMIN_PAGE_SIZE, opts.page * ADMIN_PAGE_SIZE - 1);

  const nowIso = new Date().toISOString();
  switch (opts.filter) {
    case "draft":
      query = query.eq("status", "draft");
      break;
    case "archived":
      query = query.eq("status", "archived");
      break;
    case "scheduled":
      query = query.eq("status", "published").gt("published_at", nowIso);
      break;
    case "live":
      query = query.eq("status", "published").lte("published_at", nowIso);
      break;
    default:
      break;
  }
  const term = safeSearch(opts.q);
  if (term) query = query.or(`headline.ilike.%${term}%,slug.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(`Admin story list failed: ${error.message}`);

  const rows = (data ?? []).map((row) => {
    const contributor = row.contributor as { name: string } | null;
    const category = row.category as { name: string } | null;
    return {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      status: row.status,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      lifecycle: storyLifecycle(row.status, row.published_at),
      contributorName: contributor?.name ?? null,
      categoryName: category?.name ?? null,
    } satisfies AdminStoryRow;
  });
  return { rows, total: count ?? 0 };
}

export async function getDashboardCounts(db: Db) {
  const nowIso = new Date().toISOString();
  const head = { count: "exact", head: true } as const;
  const [drafts, live, scheduled, archived, submitted, inReview] = await Promise.all([
    db.from("stories").select("id", head).eq("status", "draft"),
    db.from("stories").select("id", head).eq("status", "published").lte("published_at", nowIso),
    db.from("stories").select("id", head).eq("status", "published").gt("published_at", nowIso),
    db.from("stories").select("id", head).eq("status", "archived"),
    db.from("submissions").select("id", head).eq("status", "submitted"),
    db.from("submissions").select("id", head).eq("status", "in_review"),
  ]);
  return {
    drafts: drafts.count ?? 0,
    live: live.count ?? 0,
    scheduled: scheduled.count ?? 0,
    archived: archived.count ?? 0,
    newSubmissions: submitted.count ?? 0,
    inReview: inReview.count ?? 0,
  };
}

/** Everything the story editor needs to render, in one place. */
export async function getStoryEditorData(db: Db, id: string | null) {
  const [categories, contributors, tags, stories] = await Promise.all([
    db.from("categories").select("id, name").order("sort_order").order("name"),
    db.from("contributors").select("id, name").order("name"),
    db.from("tags").select("name").order("name"),
    db.from("stories").select("id, headline, status").order("updated_at", { ascending: false }).limit(200),
  ]);

  let story = null;
  if (id) {
    const { data, error } = await db
      .from("stories")
      .select(
        `id, slug, headline, subtitle, summary, body, category_id, contributor_id, lead_image_id, og_image_id,
         status, published_at, seo_title, seo_description, canonical_url_override, updated_at,
         story_tags(tag:tags(name)), related:related_stories!story_id(related_story_id, position)`,
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Story editor load failed: ${error.message}`);
    story = data;
  }

  return {
    categories: categories.data ?? [],
    contributors: contributors.data ?? [],
    tagSuggestions: (tags.data ?? []).map((t) => t.name),
    otherStories: (stories.data ?? []).filter((s) => s.id !== id),
    story,
  };
}
