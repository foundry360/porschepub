import "server-only";
import {
  categoryInputSchema,
  contributorInputSchema,
  flattenIssues,
  type CategoryInput,
  type ContributorInput,
} from "@/lib/editorial/schemas";
import { slugify } from "@/lib/slug";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

// -- Contributors -------------------------------------------------------------------

export function parseContributorInput(raw: unknown): Result<ContributorInput> {
  const parsed = contributorInputSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

export async function saveContributor(
  db: Db,
  actorId: string,
  input: ContributorInput,
): Promise<Result<{ id: string; slug: string }>> {
  const slug = input.slug || slugify(input.name, 80);
  if (!slug) return fail("Please fix the highlighted fields.", { slug: "A URL slug is required." });

  const row = {
    slug,
    name: input.name,
    descriptor: input.descriptor,
    bio: input.bio,
    avatar_asset_id: input.avatarAssetId,
    expertise: input.expertise,
    website_url: input.websiteUrl,
    social_url: input.socialUrl,
    profile_visible: input.profileVisible,
    is_highlighted: input.isHighlighted && input.profileVisible,
  };

  let id = input.id;
  if (id) {
    const { error } = await db.from("contributors").update(row).eq("id", id);
    if (error) return fail(describeDbError(error), error.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
  } else {
    const { data, error } = await db.from("contributors").insert(row).select("id").single();
    if (error || !data) return fail(describeDbError(error), error?.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
    id = data.id;
  }

  const { error: privateError } = await db
    .from("contributor_private")
    .upsert({ contributor_id: id, email: input.email, notes: input.notes, updated_at: new Date().toISOString() });
  if (privateError) return fail(describeDbError(privateError));

  await writeAudit(db, actorId, input.id ? "contributor.updated" : "contributor.created", "contributor", id, { slug });
  return ok({ id, slug });
}

export async function deleteContributor(db: Db, actorId: string, id: string): Promise<Result<true>> {
  const { data, error } = await db.from("contributors").delete().eq("id", id).select("id, slug");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("Only administrators can delete contributors.");
  await writeAudit(db, actorId, "contributor.deleted", "contributor", id, { slug: data[0].slug });
  return ok(true);
}

// -- Categories ------------------------------------------------------------------------

export function parseCategoryInput(raw: unknown): Result<CategoryInput> {
  const parsed = categoryInputSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

export async function saveCategory(
  db: Db,
  actorId: string,
  input: CategoryInput,
): Promise<Result<{ id: string; slug: string }>> {
  const slug = input.slug || slugify(input.name, 80);
  if (!slug) return fail("Please fix the highlighted fields.", { slug: "A URL slug is required." });
  const row = { slug, name: input.name, description: input.description, sort_order: input.sortOrder };

  if (input.id) {
    const { error } = await db.from("categories").update(row).eq("id", input.id);
    if (error) return fail(describeDbError(error), error.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
    await writeAudit(db, actorId, "category.updated", "category", input.id, { slug });
    return ok({ id: input.id, slug });
  }
  const { data, error } = await db.from("categories").insert(row).select("id").single();
  if (error || !data) return fail(describeDbError(error), error?.code === "23505" ? { slug: "That URL slug is already in use." } : undefined);
  await writeAudit(db, actorId, "category.created", "category", data.id, { slug });
  return ok({ id: data.id, slug });
}

export async function deleteCategory(db: Db, actorId: string, id: string): Promise<Result<true>> {
  const { count } = await db
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return fail(`${count} stories still use this category. Move them to another category first.`);
  }
  const { data, error } = await db.from("categories").delete().eq("id", id).select("id, slug");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("Only administrators can delete categories.");
  await writeAudit(db, actorId, "category.deleted", "category", id, { slug: data[0].slug });
  return ok(true);
}

// -- Tags -----------------------------------------------------------------------------------

export async function renameTag(db: Db, actorId: string, id: string, name: string): Promise<Result<true>> {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > 60) return fail("Tag names must be 1–60 characters.");
  const { error } = await db.from("tags").update({ name: cleaned }).eq("id", id);
  if (error) return fail(describeDbError(error));
  await writeAudit(db, actorId, "tag.renamed", "tag", id, {});
  return ok(true);
}

export async function deleteTag(db: Db, actorId: string, id: string): Promise<Result<true>> {
  const { data, error } = await db.from("tags").delete().eq("id", id).select("id");
  if (error) return fail(describeDbError(error));
  if (!data || data.length === 0) return fail("That tag could not be found.");
  await writeAudit(db, actorId, "tag.deleted", "tag", id, {});
  return ok(true);
}
