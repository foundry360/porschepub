import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { StoryCard } from "@/components/story/story-card";
import { EditorialImage } from "@/components/ui/editorial-image";
import { InlineText } from "@/components/ui/inline-text";
import { EmptyState, JsonLd, PageContainer, SectionHeader, SubmitCta } from "@/components/ui/misc";
import { Pill } from "@/components/ui/pill";
import { RevealOnView } from "@/components/ui/reveal-on-view";
import { formatDate } from "@/lib/dates";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import type { ContributorSummary, MediaImage, StorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";
import { getContributorBySlug, getHomepage } from "@/server/content/public";

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: ${brand.tagline}` },
  description: brand.description,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

/** Licensed under the Unsplash License (free commercial use, no permission needed). */
const HERO_IMAGE: MediaImage = {
  id: "home-hero",
  url: "/images/hero-porsche-911-targa-sunset-3200.jpg",
  width: 3200,
  height: 2133,
  alt: "",
  caption: null,
  credit: "Jonathan Rathgeb / Unsplash",
};

export default async function HomePage() {
  const home = await getHomepage();
  const { featured, hero } = home;
  const heroImage = HERO_IMAGE;
  const recent = home.latest.length > 3 ? home.latest.slice(0, home.latest.length - (home.latest.length % 3)) : home.latest;
  const spotlight = home.contributors.find((contributor) => contributor.hasProfile) ?? null;

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      {/* Hero ------------------------------------------------------------ */}
      <section
        aria-labelledby="hero-heading"
        className="on-dark relative isolate flex min-h-[78svh] items-end overflow-hidden bg-charcoal text-paper"
      >
        {heroImage ? (
          <>
            <EditorialImage
              image={heroImage}
              sizes="100vw"
              priority
              decorative
              className="!absolute inset-0 !aspect-auto h-full w-full"
              imageClassName="object-[55%_center]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
            />
          </>
        ) : null}
        <div className="relative mx-auto w-full max-w-[88rem] px-5 pb-12 pt-32 sm:px-8 sm:pb-20">
          <p className="eyebrow animate-fade-up text-paper">{hero.kicker}</p>
          <h1
            id="hero-heading"
            className="font-display animate-fade-up mt-5 max-w-4xl text-[3rem] leading-[0.98] [animation-delay:120ms] sm:text-[5.5rem]"
          >
            {hero.headline}
          </h1>
          <p className="animate-fade-up mt-6 max-w-xl text-[1.1rem] leading-relaxed text-paper/85 [animation-delay:240ms] sm:text-[1.25rem]">
            {hero.intro}
          </p>
          <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-x-8 gap-y-4 [animation-delay:360ms]">
            <Link
              href={paths.stories()}
              className="bg-paper px-7 py-4 text-sm tracking-wide text-ink transition-colors hover:bg-[#f4c9c5]"
            >
              Read the stories
            </Link>
            <Link href={paths.tellYourStory()} className="eyebrow border-b border-paper/60 pb-1 hover:border-paper">
              Tell your story
            </Link>
          </div>
          {heroImage?.credit ? (
            <p className="mt-10 text-[0.7rem] uppercase tracking-[0.12em] text-paper/60">
              Photograph: {heroImage.credit}
            </p>
          ) : null}
        </div>
      </section>

      {!featured ? (
        <PageContainer className="py-24">
          <EmptyState title="Stories are on their way" action={{ href: paths.tellYourStory(), label: "Pitch the first story" }}>
            <p>We haven&rsquo;t published anything yet. Check back soon, or tell us your story.</p>
          </EmptyState>
        </PageContainer>
      ) : (
        <>
          {recent.length > 0 ? (
            <RevealOnView effect="from-left">
              <section aria-labelledby="latest-heading">
                <PageContainer className="py-20 sm:py-28">
                  <SectionHeader id="latest-heading" title="Most recent" href={paths.stories()} hrefLabel="All stories" />
                  <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {recent.map((story) => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </PageContainer>
              </section>
            </RevealOnView>
          ) : null}

          {home.editorsPicks.length > 0 ? (
            <RevealOnView effect="from-right">
              <section aria-labelledby="picks-heading">
                <PageContainer className="pb-20 sm:pb-28">
                  <SectionHeader id="picks-heading" eyebrow="Selected by the editors" title="Editors’ picks" />
                  <PicksMosaic stories={home.editorsPicks} />
                </PageContainer>
              </section>
            </RevealOnView>
          ) : null}

          <FeaturedStory story={featured} />
        </>
      )}

      <section aria-labelledby="pause-heading" className="bg-ink text-paper">
        <div className="mx-auto max-w-[88rem] px-5 py-28 text-center sm:px-8 sm:py-40">
          <p className="eyebrow eyebrow-slash opacity-75">Why we publish</p>
          <h2 id="pause-heading" className="font-headline mx-auto mt-6 max-w-5xl text-[clamp(2.4rem,6.5vw,6rem)]">
            Behind every car is a person. <em>Behind every person, a story.</em>
          </h2>
        </div>
      </section>

      {home.categories.length > 0 ? (
        <RevealOnView effect="zoom">
          <section aria-labelledby="explore-heading" className="bg-paper-deep">
            <PageContainer className="py-20 sm:py-28">
              <SectionHeader id="explore-heading" title="Explore" eyebrow="Categories" href={paths.stories()} hrefLabel="All stories" />
              <ol className="mt-4">
                {home.categories.map((category, index) => (
                  <li key={category.id} className="border-b border-line">
                    <Link
                      href={paths.category(category.slug)}
                      className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-6 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:gap-8"
                    >
                      <span className="eyebrow text-stone">{String(index + 1).padStart(2, "0")}</span>
                      <span className="font-condensed text-[1.8rem] transition-colors group-hover:text-accent sm:text-[2.6rem]">
                        {category.name}
                      </span>
                      <span className="hidden text-[0.95rem] leading-snug text-stone sm:block">{category.description}</span>
                      <span aria-hidden className="text-stone transition-transform group-hover:translate-x-1 group-hover:text-ink">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </PageContainer>
          </section>
        </RevealOnView>
      ) : null}

      {spotlight ? <ContributorSpotlight contributor={spotlight} others={home.contributors.filter((c) => c.id !== spotlight.id)} /> : null}

      <SubmitCta />
    </>
  );
}

/** The featured story as a typographic slab that continues the hero. */
function FeaturedStory({ story }: { story: StorySummary }) {
  return (
    <section aria-labelledby="featured-heading" className="bg-paper-deep text-ink">
      <div className="mx-auto grid max-w-[88rem] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="eyebrow eyebrow-slash text-stone">
            Featured story{story.category ? ` · ${story.category.name}` : ""}
          </p>
          <h2 id="featured-heading" className="font-condensed mt-6 text-[clamp(2.8rem,7vw,6.5rem)]">
            <Link href={paths.story(story.slug)}>
              {story.headline}
            </Link>
          </h2>
        </div>
        <div className="space-y-6 lg:col-span-4">
          {story.subtitle || story.summary ? (
            <p className="text-[1.1rem] leading-relaxed text-charcoal">{story.subtitle ?? story.summary}</p>
          ) : null}
          <p className="eyebrow text-stone">
            {story.contributor ? `${story.contributor.name} / ` : ""}
            <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time> / {story.readingMinutes} min read
          </p>
          <Pill href={paths.story(story.slug)} variant="solid">
            Read the story
          </Pill>
        </div>
      </div>
    </section>
  );
}

/** One large tile and up to two stacked beside it; collapses gracefully with fewer picks. */
function PicksMosaic({ stories }: { stories: StorySummary[] }) {
  const [first, ...rest] = stories.slice(0, 3);
  if (rest.length === 0) {
    return <StoryCard story={first} variant="tile" className="mt-10 min-h-[32rem]" />;
  }
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-[2fr_1fr] lg:grid-rows-2">
      <StoryCard story={first} variant="tile" className="min-h-[28rem] lg:row-span-2 lg:min-h-[44rem]" />
      {rest.map((story) => (
        <StoryCard key={story.id} story={story} variant="tile" className={rest.length === 1 ? "lg:row-span-2" : ""} />
      ))}
    </div>
  );
}

async function ContributorSpotlight({
  contributor,
  others,
}: {
  contributor: ContributorSummary;
  others: ContributorSummary[];
}) {
  const profile = await getContributorBySlug(contributor.slug);
  const bio = profile?.bio?.split("\n").find((line) => line.trim()) ?? null;

  return (
    <section aria-labelledby="spotlight-heading">
      <PageContainer className="grid gap-12 py-20 sm:py-28 md:grid-cols-12 md:items-center md:gap-16">
        <div className="md:col-span-5">
          {contributor.avatar ? (
            <EditorialImage
              image={contributor.avatar}
              aspect="4/5"
              sizes="(min-width: 768px) 40vw, 100vw"
              decorative
              className="rounded-[2px]"
            />
          ) : (
            <div aria-hidden className="font-display flex aspect-[4/5] items-center justify-center rounded-[2px] bg-paper-deep text-[8rem] italic text-stone">
              {contributor.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="md:col-span-7">
          <p className="eyebrow eyebrow-slash text-stone">Contributor</p>
          <h2 id="spotlight-heading" className="font-headline mt-5 text-[clamp(2.6rem,6vw,5.5rem)]">
            {contributor.name}
          </h2>
          {contributor.descriptor ? (
            <p className="font-display mt-3 text-[1.6rem] italic text-stone">{contributor.descriptor}</p>
          ) : null}
          {bio ? (
            <p className="mt-7 max-w-xl text-[1.1rem] leading-relaxed text-charcoal">
              <InlineText text={bio} />
            </p>
          ) : null}
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Pill href={paths.contributor(contributor.slug)}>Read their stories</Pill>
            <Link href={paths.contributors()} className="eyebrow text-stone transition-colors hover:text-accent">
              All contributors <span aria-hidden>→</span>
            </Link>
          </div>
          {others.length > 0 ? (
            <ul aria-label="More contributors" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6">
              {others.map((other) => (
                <li key={other.id}>
                  {other.hasProfile ? (
                    <Link href={paths.contributor(other.slug)} className="text-[0.95rem] text-charcoal hover:text-accent">
                      {other.name}
                    </Link>
                  ) : (
                    <span className="text-[0.95rem] text-stone">{other.name}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </PageContainer>
    </section>
  );
}
