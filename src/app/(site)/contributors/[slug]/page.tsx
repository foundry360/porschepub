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
import { slugParamsOrPlaceholder } from "@/lib/static-params";

/**
 * Resolve the entity before streaming starts so unknown/unpublished URLs get a
 * real HTTP 404 (and redirects are real 308s) instead of a streamed 200.
 * The data reads are cached, so this does not make the route slow.
 */
export const instant = false;

export async function generateStaticParams() {
  const slugs = await listProfileContributorSlugs(100);
  return slugParamsOrPlaceholder(slugs.map((entry) => entry.slug));
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
        {contributor.cover ? (
          <div className="animate-fade-in md:col-span-5">
            <EditorialImage image={contributor.cover} aspect="4/3" sizes="(min-width: 768px) 42vw, 100vw" priority className="rounded-[2px]" />
          </div>
        ) : null}
        <div className={`animate-fade-up ${contributor.cover ? "md:col-span-7" : "md:col-span-12"}`}>
          <p className="eyebrow eyebrow-slash mb-5 text-stone">Contributor</p>
          <div className="flex items-center gap-5 sm:gap-6">
            {contributor.avatar ? (
              <EditorialImage
                image={contributor.avatar}
                aspect="1/1"
                sizes="128px"
                priority
                className="w-20 shrink-0 overflow-hidden rounded-full sm:w-28"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="font-headline text-[clamp(2.8rem,7vw,6rem)]">{contributor.name}</h1>
              {contributor.descriptor ? (
                <p className="font-display mt-2 text-[1.7rem] italic text-stone">{contributor.descriptor}</p>
              ) : null}
            </div>
          </div>
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
                <li key={item} className="rounded-full border border-line px-4 py-2 text-[0.8rem] text-stone">
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

      <section aria-labelledby="stories-by" className="border-t border-line pt-6">
        <h2 id="stories-by" className="font-headline mb-10 text-[clamp(2rem,4vw,3.25rem)]">
          Stories by <em>{contributor.name}</em>
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
        scope={{ contributorId }}
        hrefFor={(n) => (n > 1 ? `${paths.contributor(slug)}?page=${n}` : paths.contributor(slug))}
        emptyTitle="No published stories yet"
      />
    </div>
  );
}
