import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { storyInputSchema, type StoryInput } from "@/lib/editorial/schemas";
import { deleteStory, saveStory } from "@/server/editorial/stories";
import { loadStoryDetail } from "@/server/content/story-query";
import {
  RUN,
  anonClient,
  anyCategory,
  cleanup,
  createUser,
  makeAsset,
  makeContributor,
  serviceClient,
  type TestUser,
} from "../support/db";

const service = serviceClient();
let editor: TestUser;
let admin: TestUser;
let contributorId: string;
let categoryId: string;
let leadId: string;
let leadNoAltId: string;

function input(overrides: Record<string, unknown> = {}): StoryInput {
  return storyInputSchema.parse({
    headline: `${RUN} headline`,
    slug: "",
    subtitle: "",
    summary: "A summary.",
    body: [{ type: "paragraph", text: "Some **body** text." }],
    categoryId,
    contributorId,
    leadImageId: leadId,
    ogImageId: "",
    seoTitle: "",
    seoDescription: "",
    canonicalUrlOverride: "",
    publishedAt: "",
    ...overrides,
  });
}

async function publicStory(slug: string) {
  return loadStoryDetail(anonClient(), { slug });
}

beforeAll(async () => {
  [editor, admin] = await Promise.all([createUser("editor"), createUser("admin")]);
  contributorId = (await makeContributor(service)).id;
  categoryId = (await anyCategory(service)).id;
  leadId = await makeAsset(service, "A lead image");
  leadNoAltId = await makeAsset(service, "");
});

afterAll(cleanup);

describe("story lifecycle through the editorial logic", () => {
  it("creates a draft that the public cannot see", async () => {
    const result = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-draft-one` }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("draft");
    expect(await publicStory(`${RUN}-draft-one`)).toBeNull();
    // ...but the editor can load it for preview with the same loader.
    const preview = await loadStoryDetail(editor.db, { id: result.data.id });
    expect(preview?.headline).toBe(`${RUN} headline`);
  });

  it("generates a unique slug from the headline when none is given", async () => {
    const a = await saveStory(editor.db, editor.id, input({ headline: `${RUN} Auto Slug` }));
    const b = await saveStory(editor.db, editor.id, input({ headline: `${RUN} Auto Slug` }));
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.slug).toBe(`${RUN}-auto-slug`);
      expect(b.data.slug).toBe(`${RUN}-auto-slug-2`);
    }
  });

  it("rejects an explicit slug that is already taken, and reserved slugs", async () => {
    await saveStory(editor.db, editor.id, input({ slug: `${RUN}-taken` }));
    const dupe = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-taken` }));
    expect(dupe.ok).toBe(false);
    if (!dupe.ok) expect(dupe.fieldErrors?.slug).toBeTruthy();
    const reserved = await saveStory(editor.db, editor.id, input({ slug: "admin" }));
    expect(reserved.ok).toBe(false);
  });

  it("refuses to publish an incomplete story with specific reasons", async () => {
    const draft = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-incomplete`, leadImageId: "", categoryId: "" }));
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    const published = await saveStory(
      editor.db,
      editor.id,
      input({ id: draft.data.id, slug: `${RUN}-incomplete`, intent: "publish", leadImageId: "", categoryId: "" }),
    );
    expect(published.ok).toBe(false);
    if (!published.ok) {
      expect(published.fieldErrors).toMatchObject({ leadImageId: expect.any(String), categoryId: expect.any(String) });
    }
    expect(await publicStory(`${RUN}-incomplete`)).toBeNull();
  });

  it("refuses to publish when the lead image has no alt text", async () => {
    const result = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-noalt`, intent: "publish", leadImageId: leadNoAltId }));
    expect(result.ok).toBe(false);
    expect(await publicStory(`${RUN}-noalt`)).toBeNull();
  });

  it("publishes, unpublishes and republishes", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-cycle` }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.data.id;

    const published = await saveStory(editor.db, editor.id, input({ id, slug: `${RUN}-cycle`, intent: "publish" }));
    expect(published.ok).toBe(true);
    if (published.ok) expect(published.data.publishedAt).toBeTruthy();
    const live = await publicStory(`${RUN}-cycle`);
    expect(live?.headline).toBe(`${RUN} headline`);
    expect(live?.blocks[0]).toMatchObject({ type: "paragraph" });

    const unpublished = await saveStory(editor.db, editor.id, input({ id, slug: `${RUN}-cycle`, intent: "unpublish" }));
    expect(unpublished.ok && unpublished.data.status).toBe("draft");
    expect(await publicStory(`${RUN}-cycle`)).toBeNull();

    const again = await saveStory(editor.db, editor.id, input({ id, slug: `${RUN}-cycle`, intent: "publish" }));
    expect(again.ok).toBe(true);
    expect(await publicStory(`${RUN}-cycle`)).not.toBeNull();
  });

  it("keeps a scheduled story private until its time", async () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const result = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-scheduled`, intent: "publish", publishedAt: future }));
    expect(result.ok).toBe(true);
    expect(await publicStory(`${RUN}-scheduled`)).toBeNull();
  });

  it("archives and restores", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-archive`, intent: "publish" }));
    if (!created.ok) throw new Error(created.error);
    const archived = await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-archive`, intent: "archive" }));
    expect(archived.ok && archived.data.status).toBe("archived");
    expect(await publicStory(`${RUN}-archive`)).toBeNull();
    const restored = await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-archive`, intent: "restore" }));
    expect(restored.ok && restored.data.status).toBe("draft");
  });

  it("syncs tags and related stories", async () => {
    const other = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-related-target` }));
    if (!other.ok) throw new Error(other.error);
    const created = await saveStory(
      editor.db,
      editor.id,
      input({ slug: `${RUN}-tagged`, tags: [`${RUN} Air Cooled`, `${RUN} Air Cooled`, `${RUN} Racing`], relatedIds: [other.data.id] }),
    );
    if (!created.ok) throw new Error(created.error);

    const { data: tags } = await service.from("story_tags").select("tag:tags(slug)").eq("story_id", created.data.id);
    expect((tags ?? []).map((t) => (t.tag as unknown as { slug: string }).slug).sort()).toEqual([`${RUN}-air-cooled`, `${RUN}-racing`]);

    const update = await saveStory(
      editor.db,
      editor.id,
      input({ id: created.data.id, slug: `${RUN}-tagged`, tags: [`${RUN} Racing`], relatedIds: [] }),
    );
    expect(update.ok).toBe(true);
    const { data: after } = await service.from("story_tags").select("tag:tags(slug)").eq("story_id", created.data.id);
    expect(after).toHaveLength(1);
    const { data: related } = await service.from("related_stories").select("id").eq("story_id", created.data.id);
    expect(related ?? []).toHaveLength(0);
  });

  it("refuses references to images that don't exist", async () => {
    const result = await saveStory(
      editor.db,
      editor.id,
      input({ slug: `${RUN}-ghost`, body: [{ type: "image", assetId: "0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10", layout: "inline" }] }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("slug changes and redirects", () => {
  it("records the old slug and finds the redirect target", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-before`, intent: "publish" }));
    if (!created.ok) throw new Error(created.error);
    const renamed = await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-after`, intent: "publish" }));
    expect(renamed.ok).toBe(true);
    if (renamed.ok) expect(renamed.data.previousSlug).toBe(`${RUN}-before`);

    expect(await publicStory(`${RUN}-before`)).toBeNull();
    expect(await publicStory(`${RUN}-after`)).not.toBeNull();

    const { data } = await anonClient()
      .from("story_slug_history")
      .select("story:stories(slug)")
      .eq("slug", `${RUN}-before`)
      .maybeSingle();
    expect((data?.story as unknown as { slug: string } | null)?.slug).toBe(`${RUN}-after`);
  });

  it("stops another story from taking a retired slug", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-retired`, intent: "publish" }));
    if (!created.ok) throw new Error(created.error);
    await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-current`, intent: "publish" }));

    const squatter = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-retired` }));
    expect(squatter.ok).toBe(false);
  });

  it("lets a story take back its own old slug", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-ping`, intent: "publish" }));
    if (!created.ok) throw new Error(created.error);
    await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-pong`, intent: "publish" }));
    const back = await saveStory(editor.db, editor.id, input({ id: created.data.id, slug: `${RUN}-ping`, intent: "publish" }));
    expect(back.ok).toBe(true);
    expect(await publicStory(`${RUN}-ping`)).not.toBeNull();
  });
});

describe("permissions", () => {
  it("editors cannot delete stories; administrators can", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-delete-me` }));
    if (!created.ok) throw new Error(created.error);

    const byEditor = await deleteStory(editor.db, editor.id, created.data.id);
    expect(byEditor.ok).toBe(false);
    expect((await service.from("stories").select("id").eq("id", created.data.id)).data).toHaveLength(1);

    const byAdmin = await deleteStory(admin.db, admin.id, created.data.id);
    expect(byAdmin.ok).toBe(true);
    expect((await service.from("stories").select("id").eq("id", created.data.id)).data).toHaveLength(0);
  });

  it("an account with no editorial profile cannot create stories", async () => {
    const stranger = await createUser(null, "stranger");
    const result = await saveStory(stranger.db, stranger.id, input({ slug: `${RUN}-stranger` }));
    expect(result.ok).toBe(false);
    expect((await service.from("stories").select("id").eq("slug", `${RUN}-stranger`)).data).toHaveLength(0);
  });

  it("records an audit entry for each action", async () => {
    const created = await saveStory(editor.db, editor.id, input({ slug: `${RUN}-audited`, intent: "publish" }));
    if (!created.ok) throw new Error(created.error);
    const { data } = await service
      .from("audit_log")
      .select("action, actor_id")
      .eq("entity_id", created.data.id)
      .order("id");
    expect(data?.map((row) => row.action)).toEqual(["story.published"]);
    expect(data?.[0].actor_id).toBe(editor.id);
  });
});
