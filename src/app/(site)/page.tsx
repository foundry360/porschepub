import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { ContributorCard } from "@/components/home/contributor-card";
import { StoryCard } from "@/components/story/story-card";
import { EditorialImage } from "@/components/ui/editorial-image";
import { EmptyState, JsonLd, PageContainer, SectionHeader, SubmitCta } from "@/components/ui/misc";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { paths } from "@/lib/urls";
import { getHomepage } from "@/server/content/public";

export const metadata: Metadata = {
  title: { absolute: `${brand.name}: ${brand.tagline}` },
  description: brand.description,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function HomePage() {
  const home = await getHomepage();
  const { featured, hero } = home;
  const heroImage = featured?.leadImage ?? null;
  const hasStories = Boolean(featured);

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
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/25"
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

      <PageContainer>
        {!hasStories ? (
          <div className="py-24">
            <EmptyState title="Stories are on their way" action={{ href: paths.tellYourStory(), label: "Pitch the first story" }}>
              <p>We haven&rsquo;t published anything yet. Check back soon, or tell us your story.</p>
            </EmptyState>
          </div>
        ) : (
          <>
            {/* Featured story ---------------------------------------------- */}
            <section aria-labelledby="featured-heading" className="py-16 sm:py-24">
              <h2 id="featured-heading" className="eyebrow mb-8 text-accent">
                Featured story
              </h2>
              {featured ? <StoryCard story={featured} variant="lead" headingLevel={3} /> : null}
            </section>

            {/* Editors' picks ------------------------------------------------ */}
            {home.editorsPicks.length > 0 ? (
              <section aria-labelledby="picks-heading" className="pb-16 sm:pb-24">
                <SectionHeader id="picks-heading" eyebrow="Selected by the editors" title="Editors’ picks" />
                <div className="mt-10 grid gap-x-8 gap-y-14 md:grid-cols-3">
                  {home.editorsPicks.map((story, index) => (
                    <div key={story.id} className={index === 1 ? "md:mt-16" : undefined}>
                      <StoryCard story={story} variant="tall" />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Latest + explore --------------------------------------------- */}
            {home.latest.length > 0 ? (
              <section aria-labelledby="latest-heading" className="pb-16 sm:pb-24">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
                  <div className="lg:col-span-8">
                    <SectionHeader id="latest-heading" title="Latest stories" href={paths.stories()} hrefLabel="All stories" />
                    <div className="mt-2">
                      {home.latest.map((story) => (
                        <StoryCard key={story.id} story={story} variant="compact" />
                      ))}
                    </div>
                  </div>
                  <aside aria-label="Browse by category" className="lg:col-span-4">
                    <div className="border-b border-ink pb-4">
                      <h2 className="font-display text-[1.6rem] leading-none">Explore</h2>
                    </div>
                    <ul className="mt-2">
                      {home.categories.map((category) => (
                        <li key={category.id} className="border-b border-line">
                          <Link
                            href={paths.category(category.slug)}
                            className="group flex items-baseline justify-between py-4"
                          >
                            <span className="font-display text-[1.35rem]">{category.name}</span>
                            <span aria-hidden className="text-stone transition-transform group-hover:translate-x-1">
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </aside>
                </div>
              </section>
            ) : null}
          </>
        )}
      </PageContainer>

      {/* Category rails --------------------------------------------------------- */}
      {home.categoryRails.map((rail, railIndex) => (
        <section
          key={rail.category.id}
          aria-labelledby={`rail-${rail.category.slug}`}
          className={railIndex % 2 === 0 ? "bg-paper-deep" : ""}
        >
          <PageContainer className="py-16 sm:py-24">
            <div className="flex items-end justify-between gap-6 border-b border-ink pb-4">
              <div>
                <p className="eyebrow mb-2 text-accent">Category</p>
                <h2 id={`rail-${rail.category.slug}`} className="font-display text-[1.9rem] leading-none sm:text-[2.4rem]">
                  {rail.category.name}
                </h2>
              </div>
              <Link href={paths.category(rail.category.slug)} className="eyebrow link-underline shrink-0 pb-1">
                View all
              </Link>
            </div>
            {rail.category.description ? (
              <p className="mt-5 max-w-2xl text-stone">{rail.category.description}</p>
            ) : null}
            <div className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-3">
              {rail.stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </PageContainer>
        </section>
      ))}

      {/* Contributors --------------------------------------------------------------- */}
      {home.contributors.length > 0 ? (
        <section aria-labelledby="contributors-heading">
          <PageContainer className="py-16 sm:py-24">
            <SectionHeader id="contributors-heading" title="Voices" eyebrow="Contributors" href={paths.contributors()} hrefLabel="All contributors" />
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {home.contributors.map((contributor) => (
                <ContributorCard key={contributor.id} contributor={contributor} />
              ))}
            </div>
          </PageContainer>
        </section>
      ) : null}

      <div className="mt-8">
        <SubmitCta />
      </div>
    </>
  );
}
