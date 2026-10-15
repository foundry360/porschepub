import Link from "next/link";
import { BlockRenderer } from "@/components/story/block-renderer";
import { ReadingProgress } from "@/components/story/reading-progress";
import { ShareControls } from "@/components/story/share-controls";
import { StoryCard } from "@/components/story/story-card";
import { EditorialImage } from "@/components/ui/editorial-image";
import { InlineText } from "@/components/ui/inline-text";
import { JsonLd, SubmitCta } from "@/components/ui/misc";
import { countWords, blocksToPlainText } from "@/lib/content/blocks";
import { inlineToPlainText } from "@/lib/content/inline";
import { formatDate } from "@/lib/dates";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import type { ContributorProfile, StoryDetail, StorySummary } from "@/lib/types";
import { absoluteUrl, paths, storyCanonicalUrl } from "@/lib/urls";

export function storyDescription(story: StoryDetail): string {
  const candidate =
    story.seoDescription ??
    story.summary ??
    story.subtitle ??
    (() => {
      const first = story.blocks.find((block) => block.type === "paragraph");
      return first && first.type === "paragraph" ? inlineToPlainText(first.text) : "";
    })();
  return candidate.length > 300 ? `${candidate.slice(0, 297).trimEnd()}…` : candidate;
}

function StoryHeading({ story, onImage = false }: { story: StoryDetail; onImage?: boolean }) {
  const muted = onImage ? "text-paper/80" : "text-stone";
  const hover = onImage ? "hover:text-[#ecd9b0]" : "hover:text-accent";
  return (
    <div className="max-w-5xl">
      <p className={`eyebrow eyebrow-slash animate-fade-in ${muted}`}>
        {story.category ? (
          <Link href={paths.category(story.category.slug)} className={`transition-colors ${hover}`}>
            {story.category.name}
          </Link>
        ) : (
          "A first-person story"
        )}
      </p>
      <h1 className="font-headline animate-fade-up mt-6 text-[clamp(2.6rem,7vw,6.5rem)]">{story.headline}</h1>
      {story.subtitle ? (
        <p className={`font-display animate-fade-up mt-6 max-w-3xl text-[clamp(1.4rem,2.4vw,2rem)] italic leading-snug [animation-delay:120ms] ${muted}`}>
          {story.subtitle}
        </p>
      ) : null}
      <p className={`eyebrow animate-fade-up mt-8 [animation-delay:200ms] ${muted}`}>
        {story.contributor ? (
          <>
            By{" "}
            {story.contributor.hasProfile ? (
              <Link
                href={paths.contributor(story.contributor.slug)}
                className={`border-b pb-0.5 transition-colors ${hover} ${onImage ? "border-paper/50 text-paper" : "border-line text-ink"}`}
              >
                {story.contributor.name}
              </Link>
            ) : (
              <span className={onImage ? "text-paper" : "text-ink"}>{story.contributor.name}</span>
            )}
            <span aria-hidden className="text-accent"> / </span>
          </>
        ) : null}
        <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
        <span aria-hidden className="text-accent"> / </span>
        {story.readingMinutes} min read
      </p>
    </div>
  );
}

/**
 * The article experience. Shared by the public route and the editorial preview
 * so editors see exactly what readers will see.
 */
export function StoryView({
  story,
  related,
  contributor,
  preview = false,
}: {
  story: StoryDetail;
  related: StorySummary[];
  contributor: ContributorProfile | null;
  preview?: boolean;
}) {
  const canonical = storyCanonicalUrl({ slug: story.slug, canonical_url_override: story.canonicalUrlOverride });
  const lead = story.leadImage;
  const shareUrl = absoluteUrl(paths.story(story.slug));

  return (
    <article>
      {!preview ? (
        <>
          <JsonLd
            data={[
              articleJsonLd({
                slug: story.slug,
                canonicalUrl: canonical,
                headline: story.headline,
                description: storyDescription(story),
                imageUrl: (story.ogImage ?? lead)?.url ?? null,
                publishedAt: story.publishedAt,
                modifiedAt: story.updatedAt,
                authorName: story.contributor?.name ?? "Staff",
                authorSlug: story.contributor?.slug ?? null,
                authorHasProfile: story.contributor?.hasProfile ?? false,
                category: story.category?.name ?? null,
                wordCount: countWords(blocksToPlainText(story.blocks)),
              }),
              breadcrumbJsonLd([
                { name: "Stories", path: paths.stories() },
                ...(story.category ? [{ name: story.category.name, path: paths.category(story.category.slug) }] : []),
                { name: story.headline, path: paths.story(story.slug) },
              ]),
            ]}
          />
          <ReadingProgress slug={story.slug} targetId="story-body" />
        </>
      ) : null}

      {lead ? (
        <header className="on-dark relative isolate flex min-h-[80svh] items-end overflow-hidden bg-charcoal text-paper">
          <EditorialImage
            image={lead}
            priority
            sizes="100vw"
            className="!absolute inset-0 -z-10 !aspect-auto h-full w-full"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          <div className="mx-auto w-full max-w-[88rem] px-5 pb-12 pt-32 sm:px-8 sm:pb-16">
            <StoryHeading story={story} onImage />
            {lead.credit ? (
              <p className="mt-10 text-right text-[0.7rem] uppercase tracking-[0.12em] text-paper/65">
                Photograph: {lead.credit}
              </p>
            ) : null}
          </div>
        </header>
      ) : (
        <header className="mx-auto max-w-[88rem] px-5 pb-6 pt-16 sm:px-8 sm:pt-24">
          <StoryHeading story={story} />
        </header>
      )}

      {lead?.caption ? (
        <p className="mx-auto mt-4 max-w-[88rem] px-5 text-[0.85rem] leading-snug text-stone sm:px-8">{lead.caption}</p>
      ) : null}

      <div className="mx-auto mt-14 max-w-[44rem] px-5 sm:mt-20 sm:px-0" id="story-body">
        <BlockRenderer blocks={story.blocks} images={story.images} />

        {story.tags.length > 0 ? (
          <ul aria-label="Topics" className="mt-14 flex flex-wrap gap-2">
            {story.tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  href={paths.tag(tag.slug)}
                  className="inline-block rounded-full border border-line px-4 py-2 text-[0.8rem] text-stone transition-colors hover:border-ink hover:text-ink"
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="no-print mt-12 border-t border-line pt-8">
          <ShareControls url={shareUrl} title={story.headline} />
        </div>

        {story.contributor ? (
          <aside aria-label="About the contributor" className="mt-16 rounded-[20px] border border-line p-6 sm:p-8">
            <p className="eyebrow eyebrow-slash text-stone">About the contributor</p>
            <div className="mt-5 flex gap-5">
              {story.contributor.avatar ? (
                <div className="w-20 shrink-0 sm:w-24">
                  <EditorialImage
                    image={story.contributor.avatar}
                    aspect="1/1"
                    sizes="96px"
                    decorative
                    reveal={false}
                    className="rounded-full"
                  />
                </div>
              ) : null}
              <div>
                <p className="font-headline text-[1.75rem]">{story.contributor.name}</p>
                {story.contributor.descriptor ? (
                  <p className="font-display mt-1 text-[1.2rem] italic text-stone">{story.contributor.descriptor}</p>
                ) : null}
                {contributor?.bio ? (
                  <p className="mt-3 line-clamp-4 text-[0.95rem] leading-relaxed text-charcoal">
                    <InlineText text={contributor.bio.split("\n")[0]} />
                  </p>
                ) : null}
                {story.contributor.hasProfile ? (
                  <Link
                    href={paths.contributor(story.contributor.slug)}
                    className="eyebrow mt-5 inline-block text-ink transition-colors hover:text-accent"
                  >
                    Profile and stories <span aria-hidden>→</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mx-auto mt-28 max-w-[88rem] px-5 sm:px-8">
          <div className="border-t border-line pt-6">
            <h2 id="related-heading" className="font-headline text-[clamp(2.2rem,4.5vw,3.75rem)]">
              Keep <em>reading</em>
            </h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {related.map((item) => (
              <StoryCard key={item.id} story={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-28">
        <SubmitCta />
      </div>
    </article>
  );
}
