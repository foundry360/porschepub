import "server-only";
import {
  blocksToPlainText,
  collectImageAssetIds,
  estimateReadingMinutes,
} from "@/lib/content/blocks";
import {
  flattenIssues,
  storyInputSchema,
  type StoryInput,
  type StoryIntent,
} from "@/lib/editorial/schemas";
import { findAvailableSlug, isReservedSlug, slugify } from "@/lib/slug";
import { blockingIssues, storyReadiness } from "@/lib/workflow";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

export type SavedStory = {
  id: string;
  slug: string;
  previousSlug: string | null;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
};

/** Raw editor input (strings and parsed JSON) before schema validation. */
export function parseStoryInput(raw: unknown): Result<StoryInput> {
  const parsed = storyInputSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
  }
  return ok(parsed.data);
}

async function slugTaken(db: Db, candidate: string, exceptId?: string): Promise<boolean> {
  let query = db.from("stories").select("id").eq("slug", candidate).limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data } = await query;
  if (data && data.length > 0) return true;
  // Another story's historical slug is also unavailable (it redirects there).
  const { data: history } = await db
    .from("story_slug_history")
    .select("story_id")
    .eq("slug", candidate)
    .limit(1);
  return Boolean(history && history.length > 0 && history[0].story_id !== exceptId);
}

/**
 * Create or update a story and apply a lifecycle intent.
 *
 * Runs with the EDITOR'S OWN session client, so Row Level Security is the real
 * authorization: if the caller is not an editor, every statement below fails.
 */
export async function saveStory(
  db: Db,
  actorId: string,
  input: StoryInput,
): Promise<Result<SavedStory>> {
  const isUpdate = Boolean(input.id);

  // Existing state (for slug changes and keeping status).
  let existing: { id: string; slug: string; status: SavedStory["status"]; published_at: string | null } | null = null;
  if (input.id) {
    const { data, error } = await db
      .from("stories")
      .select("id, slug, status, published_at")
      .eq("id", input.id)
      .maybeSingle();
    if (error) return fail(describeDbError(error));
    if (!data) return fail("That story could not be found.");
    existing = data;
  }

  // Slug ------------------------------------------------------------------------
  let slug = input.slug;
  if (!slug) {
    const base = slugify(input.headline, 80) || "untitled";
    slug = await findAvailableSlug(base, (candidate) => slugTaken(db, candidate, input.id));
  } else if (isReservedSlug(slug)) {
    return fail("Please fix the highlighted fields.", { slug: "That slug is reserved. Choose another." });
  } else if (await slugTaken(db, slug, input.id)) {
    return fail("Please fix the highlighted fields.", { slug: "That URL slug is already in use." });
  }

  // Referenced images must exist --------------------------------------------------
  const imageIds = new Set<string>(collectImageAssetIds(input.body));
  if (input.leadImageId) imageIds.add(input.leadImageId);
  if (input.ogImageId) imageIds.add(input.ogImageId);
  let leadAlt: string | null = null;
  if (imageIds.size > 0) {
    const { data: assets, error } = await db
      .from("media_assets")
      .select("id, alt_text")
      .in("id", [...imageIds]);
    if (error) return fail(describeDbError(error));
    const found = new Map((assets ?? []).map((asset) => [asset.id, asset.alt_text]));
    for (const id of imageIds) {
      if (!found.has(id)) return fail("An image used in this story no longer exists. Re-select it and try again.");
    }
    if (input.leadImageId) leadAlt = found.get(input.leadImageId) ?? null;
  }

  // Lifecycle -------------------------------------------------------------------------
  const currentStatus = existing?.status ?? "draft";
  const nextStatus: SavedStory["status"] = lifecycleStatus(input.intent, currentStatus);

  if (nextStatus === "published") {
    const problems = blockingIssues(
      storyReadiness({
        slug,
        headline: input.headline,
        summary: input.summary,
        bodyBlockCount: input.body.length,
        contributorId: input.contributorId,
        categoryId: input.categoryId,
        leadImageId: input.leadImageId,
        leadImageAlt: leadAlt,
        seoDescription: input.seoDescription,
      }),
    );
    if (problems.length > 0) {
      return fail(
        `This story can’t be published yet: ${problems.map((p) => p.message).join(" ")}`,
        Object.fromEntries(problems.map((p) => [p.field, p.message])),
      );
    }
  }

  const plain = blocksToPlainText(input.body);
  const imageCount = input.body.filter((block) => block.type === "image").length;

  let publishedAt: string | null = existing?.published_at ?? null;
  if (input.intent === "publish") publishedAt = input.publishedAt ?? existing?.published_at ?? new Date().toISOString();
  else if (input.publishedAt) publishedAt = input.publishedAt;

  const row = {
    slug,
    headline: input.headline,
    subtitle: input.subtitle,
    summary: input.summary,
    body: input.body,
    body_text: plain,
    reading_minutes: estimateReadingMinutes(plain, imageCount),
    contributor_id: input.contributorId,
    category_id: input.categoryId,
    lead_image_id: input.leadImageId,
    og_image_id: input.ogImageId,
    status: nextStatus,
    published_at: publishedAt,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    canonical_url_override: input.canonicalUrlOverride,
    updated_by: actorId,
  };

  let storyId: string;
  if (isUpdate && input.id) {
    const { error } = await db.from("stories").update(row).eq("id", input.id);
    if (error) return fail(describeDbError(error), error.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
    storyId = input.id;
  } else {
    const { data, error } = await db
      .from("stories")
      .insert({ ...row, created_by: actorId })
      .select("id")
      .single();
    if (error || !data) return fail(describeDbError(error), error?.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
    storyId = data.id;
  }

  const tagResult = await syncTags(db, storyId, input.tags);
  if (!tagResult.ok) return tagResult;
  const relatedResult = await syncRelated(db, storyId, input.relatedIds);
  if (!relatedResult.ok) return relatedResult;

  await writeAudit(db, actorId, auditAction(input.intent, isUpdate), "story", storyId, {
    slug,
    from: existing?.status ?? null,
    to: nextStatus,
  });

  return ok({
    id: storyId,
    slug,
    previousSlug: existing && existing.slug !== slug ? existing.slug : null,
    status: nextStatus,
    publishedAt,
  });
}

function lifecycleStatus(intent: StoryIntent, current: SavedStory["status"]): SavedStory["status"] {
  switch (intent) {
    case "publish":
      return "published";
    case "unpublish":
      return "draft";
    case "archive":
      return "archived";
    case "restore":
      return "draft";
    case "save":
      return current;
  }
}

function auditAction(intent: StoryIntent, isUpdate: boolean): string {
  if (intent === "save") return isUpdate ? "story.updated" : "story.created";
  return `story.${intent === "publish" ? "published" : intent === "unpublish" ? "unpublished" : intent === "archive" ? "archived" : "restored"}`;
}

async function syncTags(db: Db, storyId: string, names: string[]): Promise<Result<true>> {
  const wanted = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name, 60);
    if (slug && !wanted.has(slug)) wanted.set(slug, name);
  }

  const tagIds: string[] = [];
  for (const [slug, name] of wanted) {
    const { data: existing, error } = await db.from("tags").select("id").eq("slug", slug).maybeSingle();
    if (error) return fail(describeDbError(error));
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const { data: created, error: createError } = await db
      .from("tags")
      .insert({ slug, name })
      .select("id")
      .single();
    if (createError || !created) return fail(describeDbError(createError));
    tagIds.push(created.id);
  }

  const { data: current, error: currentError } = await db
    .from("story_tags")
    .select("tag_id")
    .eq("story_id", storyId);
  if (currentError) return fail(describeDbError(currentError));
  const currentIds = new Set((current ?? []).map((row) => row.tag_id));
  const nextIds = new Set(tagIds);

  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
  if (toRemove.length > 0) {
    const { error } = await db.from("story_tags").delete().eq("story_id", storyId).in("tag_id", toRemove);
    if (error) return fail(describeDbError(error));
  }
  if (toAdd.length > 0) {
    const { error } = await db
      .from("story_tags")
      .insert(toAdd.map((tag_id) => ({ story_id: storyId, tag_id })));
    if (error) return fail(describeDbError(error));
  }
  return ok(true);
}

async function syncRelated(db: Db, storyId: string, relatedIds: string[]): Promise<Result<true>> {
  const unique = [...new Set(relatedIds)].filter((id) => id !== storyId);
  const { error: deleteError } = await db.from("related_stories").delete().eq("story_id", storyId);
  if (deleteError) return fail(describeDbError(deleteError));
  if (unique.length === 0) return ok(true);
  const { error } = await db
    .from("related_stories")
    .insert(unique.map((related_story_id, position) => ({ story_id: storyId, related_story_id, position })));
  if (error) return fail(describeDbError(error));
  return ok(true);
}

/** Hard delete. RLS restricts this to administrators; editors should archive. */
export async function deleteStory(db: Db, actorId: string, storyId: string): Promise<Result<{ slug: string }>> {
  const { data: story, error: readError } = await db
    .from("stories")
    .select("slug")
    .eq("id", storyId)
    .maybeSingle();
  if (readError) return fail(describeDbError(readError));
  if (!story) return fail("That story could not be found.");

  const { data, error } = await db.from("stories").delete().eq("id", storyId).select("id");
  if (error) return fail(describeDbError(error));
  // RLS turns an unauthorised delete into zero affected rows, not an error.
  if (!data || data.length === 0) return fail("Only administrators can delete stories. Archive it instead.");

  await writeAudit(db, actorId, "story.deleted", "story", storyId, { slug: story.slug });
  return ok({ slug: story.slug });
}
