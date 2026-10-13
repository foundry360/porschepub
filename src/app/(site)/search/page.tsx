import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrackEvent } from "@/components/analytics/track-event";
import { StoryCard } from "@/components/story/story-card";
import { EmptyState, PageContainer, PageIntro } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { cleanText } from "@/lib/validation/text";
import { parsePageParam, paths } from "@/lib/urls";
import { searchStories } from "@/server/content/public";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every published story.",
  // Result pages are thin, near-infinite URL spaces: keep them out of the index.
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return cleanText(value ?? "").slice(0, 100);
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <PageContainer>
      <Suspense fallback={<SearchShell query="" />}>
        <SearchResults searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

function SearchShell({ query }: { query: string }) {
  return (
    <>
      <PageIntro eyebrow="Search" title="Find a story" />
      <form action="/search" method="get" role="search" className="mb-12 flex max-w-2xl gap-3">
        <label htmlFor="search-q" className="sr-only">
          Search stories
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={100}
          placeholder="A car, a place, a person…"
          autoComplete="off"
          className="min-w-0 flex-1 border-b border-ink bg-transparent py-3 text-lg placeholder:text-mist focus:outline-none focus-visible:border-accent focus-visible:ring-0"
        />
        <button type="submit" className="bg-ink px-6 py-3 text-sm tracking-wide text-paper hover:bg-charcoal">
          Search
        </button>
      </form>
    </>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const page = parsePageParam(params.page);

  if (query.length < 2) {
    return (
      <>
        <SearchShell query={query} />
        {query.length > 0 ? (
          <p role="status" className="text-stone">
            Please enter at least two characters.
          </p>
        ) : null}
        <div className="pb-8" />
      </>
    );
  }

  const result = await searchStories(query, page);

  return (
    <>
      <SearchShell query={query} />
      <TrackEvent
        event="Search"
        props={{ results: result.total === 0 ? "none" : result.total < 5 ? "few" : "many" }}
      />
      <p role="status" className="mb-8 text-stone">
        {result.total === 0
          ? `No stories matched “${query}”.`
          : `${result.total} ${result.total === 1 ? "story" : "stories"} for “${query}”`}
      </p>
      {result.items.length === 0 ? (
        <EmptyState title="Nothing found" action={{ href: paths.stories(), label: "Browse all stories" }}>
          <p>Try a different word, or a broader term such as a model name or a place.</p>
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-x-8 gap-y-14 pb-8 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((story) => (
              <li key={story.id}>
                <StoryCard story={story} headingLevel={2} />
              </li>
            ))}
          </ul>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hrefFor={(n) => paths.search(query, n)}
            label="Search results pagination"
          />
        </>
      )}
      <p className="mt-12 pb-4 text-sm text-stone">
        Can&rsquo;t find what you&rsquo;re after?{" "}
        <Link href={paths.stories()} className="link-underline">
          Browse the archive
        </Link>
        .
      </p>
    </>
  );
}
