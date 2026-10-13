import { notFound } from "next/navigation";
import { StoryEditor, type StoryEditorInitial } from "@/components/admin/story-editor";
import { parseBodyForRender, collectImageAssetIds } from "@/lib/content/blocks";
import { requireEditor } from "@/server/auth/session";
import { getMediaByIds } from "@/server/editorial/media-queries";
import { getStoryEditorData } from "@/server/editorial/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY: StoryEditorInitial = {
  id: null,
  slug: "",
  headline: "",
  subtitle: "",
  summary: "",
  body: [],
  categoryId: "",
  contributorId: "",
  leadImageId: "",
  ogImageId: "",
  status: "draft",
  publishedAt: null,
  seoTitle: "",
  seoDescription: "",
  canonicalUrlOverride: "",
  tags: [],
  relatedIds: [],
};

/** Loads everything the editor needs. `id === null` means a new story. */
export async function StoryEditorLoader({ id, justCreated = false }: { id: string | null; justCreated?: boolean }) {
  const { db, role } = await requireEditor();
  if (id !== null && !UUID.test(id)) notFound();

  const data = await getStoryEditorData(db, id);
  if (id !== null && !data.story) notFound();

  let initial = EMPTY;
  let imageIds: string[] = [];
  if (data.story) {
    const s = data.story;
    const { blocks } = parseBodyForRender(s.body);
    imageIds = [...collectImageAssetIds(blocks), s.lead_image_id, s.og_image_id].filter((v): v is string => Boolean(v));
    const tags = (s.story_tags as Array<{ tag: { name: string } | null }>)
      .map((entry) => entry.tag?.name)
      .filter((name): name is string => Boolean(name));
    const related = (s.related as Array<{ related_story_id: string; position: number }>)
      .sort((a, b) => a.position - b.position)
      .map((r) => r.related_story_id);
    initial = {
      id: s.id,
      slug: s.slug,
      headline: s.headline,
      subtitle: s.subtitle ?? "",
      summary: s.summary ?? "",
      body: blocks,
      categoryId: s.category_id ?? "",
      contributorId: s.contributor_id ?? "",
      leadImageId: s.lead_image_id ?? "",
      ogImageId: s.og_image_id ?? "",
      status: s.status,
      publishedAt: s.published_at,
      seoTitle: s.seo_title ?? "",
      seoDescription: s.seo_description ?? "",
      canonicalUrlOverride: s.canonical_url_override ?? "",
      tags,
      relatedIds: related,
    };
  }

  const media = await getMediaByIds(db, imageIds);
  const images = Object.fromEntries(
    Object.values(media).map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt }]),
  );

  return (
    <StoryEditor
      // Remount if the story id changes (e.g. after first save of a new story).
      key={initial.id ?? "new"}
      initial={initial}
      categories={data.categories}
      contributors={data.contributors}
      tagSuggestions={data.tagSuggestions}
      otherStories={data.otherStories}
      images={images}
      isAdmin={role === "admin"}
      initialMessage={justCreated ? "Saved as a draft. You can keep editing, preview, or publish." : undefined}
    />
  );
}
