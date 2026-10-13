import type { MetadataRoute } from "next";
import { absoluteUrl, paths } from "@/lib/urls";
import {
  listCategories,
  listLiveStoryIndex,
  listProfileContributorSlugs,
} from "@/server/content/public";

/**
 * Only live, public URLs. Drafts, previews, search results, admin and
 * submission pages never appear here. Data comes from the same RLS-protected
 * public queries as the pages, so unpublishing a story removes it from the
 * sitemap as soon as the story cache tag is invalidated.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, categories, contributors] = await Promise.all([
    listLiveStoryIndex(5000),
    listCategories(),
    listProfileContributorSlugs(5000),
  ]);

  const latestStory = stories[0]?.updatedAt;

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(paths.home()),
      lastModified: latestStory,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(paths.stories()),
      lastModified: latestStory,
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: absoluteUrl(paths.contributors()), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl(paths.about()), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl(paths.tellYourStory()), changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl(paths.privacy()), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl(paths.submissionTerms()), changeFrequency: "yearly", priority: 0.2 },
  ];

  for (const category of categories) {
    entries.push({
      url: absoluteUrl(paths.category(category.slug)),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const contributor of contributors) {
    entries.push({
      url: absoluteUrl(paths.contributor(contributor.slug)),
      lastModified: contributor.updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  for (const story of stories) {
    entries.push({
      url: absoluteUrl(paths.story(story.slug)),
      lastModified: story.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
      ...(story.imageUrl ? { images: [story.imageUrl] } : {}),
    });
  }

  return entries;
}
