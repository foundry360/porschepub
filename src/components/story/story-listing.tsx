import type { Paginated, StorySummary } from "@/lib/types";
import { EmptyState } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { StoryCard } from "./story-card";

export function StoryListingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading stories…</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-4" aria-hidden>
          <div className="aspect-video animate-pulse rounded-[2px] bg-paper-deep" />
          <div className="h-3 w-24 animate-pulse bg-paper-deep" />
          <div className="h-6 w-5/6 animate-pulse bg-paper-deep" />
          <div className="h-4 w-2/3 animate-pulse bg-paper-deep" />
        </div>
      ))}
    </div>
  );
}

/**
 * Archive grid with a lead story on the first page for visual rhythm.
 * Pagination uses real links so every page is crawlable and shareable.
 */
export function StoryListing({
  result,
  hrefFor,
  emptyTitle = "No stories yet",
  emptyMessage,
  withLead = true,
}: {
  result: Paginated<StorySummary>;
  hrefFor: (page: number) => string;
  emptyTitle?: string;
  emptyMessage?: string;
  withLead?: boolean;
}) {
  if (result.items.length === 0) {
    return (
      <EmptyState title={emptyTitle} action={{ href: "/stories", label: "Browse all stories" }}>
        <p>{emptyMessage ?? "There are no published stories here yet."}</p>
      </EmptyState>
    );
  }

  const showLead = withLead && result.page === 1 && result.items.length > 2;
  const [lead, ...rest] = result.items;
  const grid = showLead ? rest : result.items;

  return (
    <>
      {showLead ? (
        <div className="border-b border-line pb-14">
          <StoryCard story={lead} variant="lead" priority headingLevel={2} />
        </div>
      ) : null}
      <ul className={`grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 ${showLead ? "pt-14" : ""}`}>
        {grid.map((story, index) => (
          <li key={story.id}>
            <StoryCard story={story} headingLevel={2} priority={!showLead && index < 3} />
          </li>
        ))}
      </ul>
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} label="Stories pagination" />
    </>
  );
}
