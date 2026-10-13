import type { Paginated, StorySummary } from "@/lib/types";
import { EmptyState } from "@/components/ui/misc";
import type { StoryScope } from "@/app/(site)/load-more-action";
import { StoryCard } from "./story-card";
import { StoryGrid } from "./story-grid";

export function StoryListingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
 * Archive grid with a lead story on the first page for visual rhythm, and a
 * "Load more" control backed by real page links so every page stays crawlable.
 */
export function StoryListing({
  result,
  hrefFor,
  scope = {},
  emptyTitle = "No stories yet",
  emptyMessage,
  withLead = true,
}: {
  result: Paginated<StorySummary>;
  hrefFor: (page: number) => string;
  scope?: StoryScope;
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
        <StoryCard story={lead} variant="lead" priority headingLevel={2} />
      ) : null}
      <StoryGrid
        key={`${hrefFor(result.page)}|${grid.map((story) => story.id).join(",")}`}
        initialItems={grid}
        page={result.page}
        totalPages={result.totalPages}
        scope={scope}
        pageHrefs={Object.fromEntries(
          Array.from({ length: Math.max(0, result.totalPages - result.page) }, (_, i) => {
            const n = result.page + 1 + i;
            return [n, hrefFor(n)];
          }),
        )}
        firstPageHref={hrefFor(1)}
        priorityCount={showLead ? 0 : 3}
        className={showLead ? "pt-8" : ""}
      />
    </>
  );
}
