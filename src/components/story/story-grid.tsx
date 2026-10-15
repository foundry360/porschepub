"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { loadMoreStories, type StoryScope } from "@/app/(site)/load-more-action";
import type { StorySummary } from "@/lib/types";
import { StoryCard } from "./story-card";

/**
 * Story grid with a "Load more" control. The control is a real link to the next
 * page, so crawlers and visitors without JavaScript still reach every story;
 * with JavaScript the next page is appended in place.
 */
export function StoryGrid({
  initialItems,
  page: initialPage,
  totalPages,
  scope,
  pageHrefs,
  firstPageHref,
  priorityCount,
  className = "",
}: {
  initialItems: StorySummary[];
  page: number;
  totalPages: number;
  scope: StoryScope;
  /** Link for every later page, keyed by page number. */
  pageHrefs: Record<number, string>;
  firstPageHref: string;
  priorityCount: number;
  className?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [pages, setPages] = useState(totalPages);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement>(null);

  const nextHref = pageHrefs[page + 1];
  const hasMore = page < pages && Boolean(nextHref);

  function loadMore(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const firstNewIndex = items.length;
    startTransition(async () => {
      try {
        const result = await loadMoreStories(scope, page + 1);
        const seen = new Set(items.map((story) => story.id));
        const fresh = result.items.filter((story) => !seen.has(story.id));
        setItems((current) => [...current, ...fresh]);
        setPage(result.page);
        if (result.totalPages > 0) setPages(result.totalPages);
        setFailed(false);
        setAnnouncement(`${fresh.length} more ${fresh.length === 1 ? "story" : "stories"} loaded.`);
        // Keyboard users continue from the first new story rather than the button.
        window.requestAnimationFrame(() => {
          listRef.current?.children[firstNewIndex]?.querySelector<HTMLAnchorElement>("a")?.focus();
        });
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <ul ref={listRef} className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {items.map((story, index) => (
          <li key={story.id} className={index >= initialItems.length ? "animate-fade-up" : undefined}>
            <StoryCard story={story} headingLevel={2} priority={index < priorityCount} />
          </li>
        ))}
      </ul>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {hasMore || page > initialPage || initialPage > 1 ? (
        <div className="mt-16 flex flex-col items-center gap-5 border-t border-line pt-10">
          {hasMore ? (
            <a
              href={nextHref}
              onClick={loadMore}
              aria-disabled={pending}
              className={`inline-flex items-center gap-2.5 rounded-full border border-ink px-8 py-4 text-[0.8125rem] font-medium tracking-[0.02em] text-ink transition-colors hover:border-brand hover:bg-brand hover:text-on-brand ${
                pending ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {pending ? "Loading…" : "Load more stories"}
            </a>
          ) : (
            <p className="eyebrow text-stone">That&rsquo;s every story</p>
          )}
          {failed ? (
            <p role="alert" className="text-[0.9rem] font-medium text-accent-deep">
              Those stories couldn&rsquo;t be loaded. Please try again.
            </p>
          ) : null}
          {initialPage > 1 ? (
            <Link href={firstPageHref} className="eyebrow link-underline text-stone">
              Back to the newest stories
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
