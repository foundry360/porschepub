import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { storyDescription, StoryView } from "@/components/story/story-view";
import { paths, storyCanonicalUrl } from "@/lib/urls";
import {
  findStoryRedirect,
  getRelatedStories,
  getStoryBySlug,
  listLiveStoryIndex,
} from "@/server/content/public";
import { slugParamsOrPlaceholder } from "@/lib/static-params";

/**
 * Resolve the entity before streaming starts so unknown/unpublished URLs get a
 * real HTTP 404 (and redirects are real 308s) instead of a streamed 200.
 * The data reads are cached, so this does not make the route slow.
 */
export const instant = false;

export async function generateStaticParams() {
  const index = await listLiveStoryIndex(100);
  return slugParamsOrPlaceholder(index.map((entry) => entry.slug));
}

export async function generateMetadata({ params }: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Story not found", robots: { index: false, follow: false } };

  const image = story.ogImage ?? story.leadImage;
  const description = storyDescription(story);
  const title = story.seoTitle ?? story.headline;
  const canonical = storyCanonicalUrl({ slug: story.slug, canonical_url_override: story.canonicalUrlOverride });

  return {
    title,
    description,
    alternates: { canonical },
    authors: story.contributor ? [{ name: story.contributor.name }] : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt,
      authors: story.contributor ? [story.contributor.name] : undefined,
      section: story.category?.name,
      tags: story.tags.map((tag) => tag.name),
      images: image
        ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default async function StoryPage({ params }: PageProps<"/stories/[slug]">) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    // A renamed story keeps working: permanent redirect to the current URL.
    const target = await findStoryRedirect(slug);
    if (target) permanentRedirect(paths.story(target));
    notFound();
  }

  const related = await getRelatedStories(story.id, story.category?.id ?? null);

  return <StoryView story={story} related={related} />;
}
