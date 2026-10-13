import { getSiteUrl } from "@/config/site";

/** Single source of truth for public URL shapes. */
export const paths = {
  home: () => "/",
  stories: (page?: number) => (page && page > 1 ? `/stories?page=${page}` : "/stories"),
  story: (slug: string) => `/stories/${slug}`,
  category: (slug: string, page?: number) =>
    page && page > 1 ? `/categories/${slug}?page=${page}` : `/categories/${slug}`,
  tag: (slug: string, page?: number) =>
    page && page > 1 ? `/tags/${slug}?page=${page}` : `/tags/${slug}`,
  contributors: () => "/contributors",
  contributor: (slug: string) => `/contributors/${slug}`,
  search: (query?: string, page?: number) => {
    if (!query) return "/search";
    const params = new URLSearchParams({ q: query });
    if (page && page > 1) params.set("page", String(page));
    return `/search?${params.toString()}`;
  },
  about: () => "/about",
  privacy: () => "/privacy",
  submissionTerms: () => "/submission-terms",
  tellYourStory: () => "/tell-your-story",
  feed: () => "/feed.xml",
} as const;

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical URL for a story, honouring an editor-supplied override. */
export function storyCanonicalUrl(story: { slug: string; canonical_url_override?: string | null }): string {
  return story.canonical_url_override || absoluteUrl(paths.story(story.slug));
}

/** Parse a positive integer page param, defaulting to 1. */
export function parsePageParam(value: string | string[] | undefined, max = 10_000): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, max);
}
