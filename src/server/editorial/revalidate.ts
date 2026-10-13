import "server-only";
import { updateTag } from "next/cache";

/**
 * Immediate ("read your own writes") invalidation of the public caches.
 * `updateTag` may only be called from Server Actions, so keep these calls in
 * the action layer and the pure editorial logic testable without Next.
 *
 * Unpublishing MUST go through here so removed stories disappear at once
 * rather than after the cache lifetime.
 */
export function invalidateStory(slug: string, previousSlug?: string | null): void {
  updateTag("stories");
  updateTag(`story:${slug}`);
  if (previousSlug && previousSlug !== slug) updateTag(`story:${previousSlug}`);
  updateTag("homepage");
  updateTag("contributors"); // contributor pages list their stories
  updateTag("categories");
  updateTag("tags");
}

export function invalidateContributor(slug: string): void {
  updateTag("contributors");
  updateTag(`contributor:${slug}`);
  updateTag("homepage");
  updateTag("stories"); // story cards embed contributor name and avatar
}

export function invalidateTaxonomy(): void {
  updateTag("categories");
  updateTag("tags");
  updateTag("stories");
  updateTag("homepage");
}

export function invalidatePage(slug: string): void {
  updateTag("pages");
  updateTag(`page:${slug}`);
}

export function invalidateHomepage(): void {
  updateTag("homepage");
}

export function invalidateMedia(): void {
  // Alt text, captions and credits render inside stories and cards.
  updateTag("stories");
  updateTag("homepage");
  updateTag("contributors");
}
