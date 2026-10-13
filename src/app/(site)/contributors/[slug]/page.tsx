import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TrackEvent } from "@/components/analytics/track-event";
import { StoryListing, StoryListingSkeleton } from "@/components/story/story-listing";
import { EditorialImage } from "@/components/ui/editorial-image";
import { InlineText } from "@/components/ui/inline-text";
import { JsonLd, PageContainer } from "@/components/ui/misc";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/seo/jsonld";
import { parsePageParam, paths } from "@/lib/urls";
import { getContributorBySlug, listProfileContributorSlugs, listStories } from "@/server/content/public";

/**
 * Resolve the entity before streaming starts so unknown/unpublished URLs get a
 * real HTTP 404 (and redirects are real 308s) instead of a streamed 200.
 * The data reads are cached, so this does not make the route slow.
 */
export const instant = false;

export async function generateStaticParams() {
  const slugs = await listProfileContributorSlugs(100);
  return slugs.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/contributors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const contributor = await getContributorBySlug(slug);
  if (!contributor) return { title: "Contributor not found", robots: { index: false } };
  const page = parsePageParam((await searchParams).page);
  const description =
    contributor.bio?.split("\n")[0].slice(0, 200) ?? `Stories by ${contributor.name}.`;
  return {
    title: page > 1 ? `${contributor.name}, page ${page}` : contributor.name,
    description,
    alternates: { canonical: paths.contributor(contributor.slug) },
    openGraph: {
      type: "profile",
      title: contributor.name,
      description,
      images: contributor.avatar
        ? [{ url: contributor.avatar.url, width: contributor.avatar.width, height: contributor.avatar.height, alt: contributor.avatar.alt }]
        : undefined,
    },
  };
}

export default async function ContributorPage(props: PageProps<"/contributors/[slug]">) {
  const { slug } = await props.params;
  const contributor = await getContributorBySlug(slug);
  if (!contributor) notFound();

  const sameAs = [contributor.websiteUrl, contributor.socialUrl].filter((url): url is string => Boolean(url));
  const paragraphs = (contributor.bio ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <PageContainer>
      <JsonLd
        data={[
          personJsonLd({
            name: contributor.name,
            slug: contributor.slug,
            bio: contributor.bio,
            imageUrl: contributor.avatar?.url ?? null,
            sameAs,
            expertise: contributor.expertise,
          }),
          breadcrumbJsonLd([
            { name: "Contributors", path: paths.contributors() },
            { name: contributor.name, path: paths.contributor(contributor.slug) },
          ]),
        ]}
      />
      <TrackEvent event="Contributor View" props={{ contributor: contributor.slug }} />

      <header className="grid gap-10 pb-16 pt-14 sm:pt-20 md:grid-cols-12 md:gap-14">
        {contributor.avatar ? (
          <div className="animate-fade-in md:col-span-4 lg:col-span-3">
            <EditorialImage image={contributor.avatar} aspect="4/5" sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw" priority />
          </div>
        ) : null}
        <div className={`animate-fade-up ${contributor.avatar ? "md:col-span-8 lg:col-span-9" : "md:col-span-12"}`}>
          <p className="eyebrow mb-4 text-accent">Contributor</p>
          <h1 className="font-display text-[2.8rem] leading-[1.02] sm:text-[4.4rem]">{contributor.name}</h1>
          {contributor.descriptor ? (
            <p className="mt-3 font-display text-[1.4rem] text-stone">{contributor.descriptor}</p>
          ) : null}
          <div className="mt-8 max-w-2xl space-y-4 text-[1.05rem] leading-relaxed text-charcoal">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>
                <InlineText text={paragraph} />
              </p>
            ))}
          </div>
          {contributor.expertise.length > 0 ? (
            <ul aria-label="Areas of interest" className="mt-8 flex flex-wrap gap-2">
              {contributor.expertise.map((item) => (
                <li key={item} className="border border-line px-3 py-1.5 text-[0.8rem] text-stone">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {sameAs.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {contributor.websiteUrl ? (
                <li>
                  <a href={contributor.websiteUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="eyebrow link-underline">
                    Website<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
              {contributor.socialUrl ? (
                <li>
                  <a href={contributor.socialUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="eyebrow link-underline">
                    Social profile<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="stories-by" className="border-t border-ink pt-10">
        <h2 id="stories-by" className="font-display mb-10 text-[1.9rem] sm:text-[2.4rem]">
          Stories by {contributor.name}
        </h2>
        <Suspense fallback={<StoryListingSkeleton />}>
          <ContributorStories
            contributorId={contributor.id}
            slug={contributor.slug}
            searchParams={props.searchParams}
          />
        </Suspense>
      </section>
    </PageContainer>
  );
}

async function ContributorStories({
  contributorId,
  slug,
  searchParams,
}: {
  contributorId: string;
  slug: string;
  searchParams: PageProps<"/contributors/[slug]">["searchParams"];
}) {
  const page = parsePageParam((await searchParams).page);
  const result = await listStories({ page, contributorId });
  if (page > result.totalPages) notFound();
  return (
    <div className="pb-8">
      <StoryListing
        result={result}
        withLead={false}
        hrefFor={(n) => (n > 1 ? `${paths.contributor(slug)}?page=${n}` : paths.contributor(slug))}
        emptyTitle="No published stories yet"
      />
    </div>
  );
}
