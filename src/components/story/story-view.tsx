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

      <header className="mx-auto max-w-5xl px-5 pb-10 pt-12 text-center sm:px-8 sm:pb-14 sm:pt-20">
        {story.category ? (
          <p className="animate-fade-in">
            <Link href={paths.category(story.category.slug)} className="eyebrow link-underline text-accent">
              {story.category.name}
            </Link>
          </p>
        ) : null}
        <h1 className="font-display animate-fade-up mx-auto mt-5 max-w-4xl text-[2.6rem] leading-[1.03] sm:text-[4.4rem]">
          {story.headline}
        </h1>
        {story.subtitle ? (
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl font-display text-[1.35rem] leading-snug text-stone [animation-delay:120ms] sm:text-[1.6rem]">
            {story.subtitle}
          </p>
        ) : null}
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.85rem] text-stone [animation-delay:200ms]">
          {story.contributor ? (
            <span>
              By{" "}
              {story.contributor.hasProfile ? (
                <Link href={paths.contributor(story.contributor.slug)} className="link-underline text-ink">
                  {story.contributor.name}
                </Link>
              ) : (
                <span className="text-ink">{story.contributor.name}</span>
              )}
            </span>
          ) : null}
          <span aria-hidden>·</span>
          <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{story.readingMinutes} min read</span>
        </div>
      </header>

      {lead ? (
        <figure className="mx-auto max-w-[88rem] px-0 sm:px-8">
          <EditorialImage
            image={lead}
            priority
            sizes="(min-width: 1408px) 1328px, 100vw"
            aspect="16/9"
          />
          {lead.caption || lead.credit ? (
            <figcaption className="mx-auto mt-3 max-w-[44rem] px-5 text-[0.85rem] leading-snug text-stone sm:px-0">
              {lead.caption ? <span>{lead.caption}</span> : null}
              {lead.credit ? (
                <span className="block text-[0.75rem] uppercase tracking-[0.08em] text-stone">{lead.credit}</span>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="mx-auto mt-12 max-w-[44rem] px-5 sm:mt-16 sm:px-0" id="story-body">
        <BlockRenderer blocks={story.blocks} images={story.images} />

        {story.tags.length > 0 ? (
          <ul aria-label="Topics" className="mt-14 flex flex-wrap gap-2">
            {story.tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  href={paths.tag(tag.slug)}
                  className="inline-block border border-line px-3 py-1.5 text-[0.8rem] text-stone transition-colors hover:border-ink hover:text-ink"
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
          <aside aria-label="About the contributor" className="mt-14 flex gap-5 border-t border-ink pt-8">
            {story.contributor.avatar ? (
              <div className="w-20 shrink-0 sm:w-24">
                <EditorialImage image={story.contributor.avatar} aspect="1/1" sizes="96px" decorative reveal={false} />
              </div>
            ) : null}
            <div>
              <p className="eyebrow text-stone">Written by</p>
              <p className="font-display mt-1 text-2xl">{story.contributor.name}</p>
              {story.contributor.descriptor ? (
                <p className="text-[0.9rem] text-stone">{story.contributor.descriptor}</p>
              ) : null}
              {contributor?.bio ? (
                <p className="mt-3 line-clamp-4 text-[0.95rem] leading-relaxed text-charcoal">
                  <InlineText text={contributor.bio.split("\n")[0]} />
                </p>
              ) : null}
              {story.contributor.hasProfile ? (
                <Link href={paths.contributor(story.contributor.slug)} className="eyebrow link-underline mt-4 inline-block">
                  Profile and stories
                </Link>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="mx-auto mt-24 max-w-[88rem] px-5 sm:px-8">
          <div className="border-b border-ink pb-4">
            <h2 id="related-heading" className="font-display text-[1.9rem] leading-none sm:text-[2.4rem]">
              Keep reading
            </h2>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-12 md:grid-cols-3">
            {related.map((item) => (
              <StoryCard key={item.id} story={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-24">
        <SubmitCta variant="light" />
      </div>
    </article>
  );
}
