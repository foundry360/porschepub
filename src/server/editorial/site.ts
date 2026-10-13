import "server-only";
import { blocksToPlainText } from "@/lib/content/blocks";
import {
  flattenIssues,
  heroSettingSchema,
  pageInputSchema,
  type HeroSettingInput,
  type PageInput,
} from "@/lib/editorial/schemas";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

// -- Pages ---------------------------------------------------------------------------------

export function parsePageInput(raw: unknown): Result<PageInput> {
  const parsed = pageInputSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

export async function savePage(db: Db, actorId: string, input: PageInput): Promise<Result<{ slug: string }>> {
  // Sanity: an empty published page is almost certainly a mistake.
  if (input.isPublished && blocksToPlainText(input.body).length === 0) {
    return fail("A published page needs some content.", { body: "Add some content before publishing." });
  }
  const { data, error } = await db
    .from("pages")
    .update({
      title: input.title,
      summary: input.summary,
      body: input.body,
      legal_reviewed: input.legalReviewed,
      is_published: input.isPublished,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      updated_by: actorId,
    })
    .eq("id", input.id)
    .select("slug");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("That page could not be found.");
  await writeAudit(db, actorId, "page.updated", "page", input.id, {
    slug: data[0].slug,
    legalReviewed: input.legalReviewed,
    published: input.isPublished,
  });
  return ok({ slug: data[0].slug });
}

// -- Homepage -----------------------------------------------------------------------------------

export function parseHeroInput(raw: unknown): Result<HeroSettingInput> {
  const parsed = heroSettingSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

export async function saveHeroSetting(db: Db, actorId: string, input: HeroSettingInput): Promise<Result<true>> {
  const { error } = await db.from("site_settings").upsert({
    key: "home.hero",
    value: { kicker: input.kicker, headline: input.headline, intro: input.intro },
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
  if (error) return fail(describeDbError(error));
  await writeAudit(db, actorId, "homepage.hero_updated", "site_settings", "home.hero", {});
  return ok(true);
}

/**
 * Replace the homepage selections. Only LIVE stories can be selected so the
 * homepage never links to something unpublished.
 */
export async function saveHomepagePlacements(
  db: Db,
  actorId: string,
  featuredId: string | null,
  pickIds: string[],
): Promise<Result<true>> {
  const picks = [...new Set(pickIds)].filter((id) => id !== featuredId).slice(0, 6);
  const ids = [...(featuredId ? [featuredId] : []), ...picks];

  if (ids.length > 0) {
    const { data, error } = await db
      .from("stories")
      .select("id, status, published_at")
      .in("id", ids);
    if (error) return fail(describeDbError(error));
    const now = Date.now();
    const live = new Set(
      (data ?? [])
        .filter((story) => story.status === "published" && story.published_at && new Date(story.published_at).getTime() <= now)
        .map((story) => story.id),
    );
    const notLive = ids.filter((id) => !live.has(id));
    if (notLive.length > 0) return fail("Only live (published) stories can be placed on the homepage.");
  }

  const { error: deleteError } = await db
    .from("homepage_placements")
    .delete()
    .in("section", ["featured", "editors_picks"]);
  if (deleteError) return fail(describeDbError(deleteError));

  const rows = [
    ...(featuredId ? [{ section: "featured", story_id: featuredId, position: 0 }] : []),
    ...picks.map((story_id, position) => ({ section: "editors_picks", story_id, position })),
  ];
  if (rows.length > 0) {
    const { error } = await db.from("homepage_placements").insert(rows);
    if (error) return fail(describeDbError(error));
  }
  await writeAudit(db, actorId, "homepage.placements_updated", "homepage", "placements", {
    featured: featuredId,
    picks: picks.length,
  });
  return ok(true);
}
