import Link from "next/link";
import { EditorialImage } from "@/components/ui/editorial-image";
import { formatDate } from "@/lib/dates";
import type { StorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";

export type CardVariant = "standard" | "lead" | "compact" | "tile";

function Meta({ story, className = "text-stone" }: { story: StorySummary; className?: string }) {
  return (
    <p className={`eyebrow !tracking-[0.12em] ${className}`}>
      {story.contributor ? <span>{story.contributor.name}</span> : null}
      {story.contributor ? <span aria-hidden className="text-accent"> / </span> : null}
      <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
      <span aria-hidden className="text-accent"> / </span>
      <span>{story.readingMinutes} min read</span>
    </p>
  );
}

function Category({ story, className = "text-stone" }: { story: StorySummary; className?: string }) {
  if (!story.category) return null;
  return <p className={`eyebrow eyebrow-slash ${className}`}>{story.category.name}</p>;
}

/**
 * One component, several editorial treatments, so the homepage and archive
 * can vary their rhythm without inconsistent markup.
 */
export function StoryCard({
  story,
  variant = "standard",
  priority = false,
  headingLevel = 3,
  className = "",
}: {
  story: StorySummary;
  variant?: CardVariant;
  priority?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = paths.story(story.slug);

  if (variant === "tile") {
    return (
      <article className={`on-dark group relative isolate flex min-h-[22rem] overflow-hidden rounded-[2px] bg-charcoal text-paper ${className}`}>
        {story.leadImage ? (
          <EditorialImage
            image={story.leadImage}
            sizes="(min-width: 1024px) 60vw, 100vw"
            priority={priority}
            decorative
            className="!absolute inset-0 -z-10 !aspect-auto h-full w-full"
            imageClassName="transition-transform duration-1000 group-hover:scale-[1.04]"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
        <div className="mt-auto space-y-3 p-6 sm:p-8">
          <Category story={story} className="text-paper/80" />
          <Heading className="font-condensed max-w-2xl text-[1.9rem] sm:text-[2.5rem]">
            <Link href={href} className="after:absolute after:inset-0">
              {story.headline}
            </Link>
          </Heading>
          <Meta story={story} className="text-paper/75" />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={`group relative border-t border-line py-6 first:border-t-0 sm:py-7 ${className}`}>
        <div className="grid grid-cols-[1fr_auto] gap-5">
          <div className="space-y-2.5">
            <Category story={story} />
            <Heading className="font-condensed text-[1.6rem] text-ink sm:text-[1.9rem]">
              <Link href={href} className="after:absolute after:inset-0">
                {story.headline}
              </Link>
            </Heading>
            {story.summary ? (
              <p className="line-clamp-2 max-w-xl text-[0.95rem] text-stone">{story.summary}</p>
            ) : null}
            <Meta story={story} />
          </div>
          {story.leadImage ? (
            <div className="w-24 shrink-0 sm:w-36">
              <EditorialImage
                image={story.leadImage}
                aspect="1/1"
                sizes="144px"
                decorative
                reveal={false}
                className="rounded-[2px]"
                imageClassName="transition-transform duration-700 group-hover:scale-[1.04]"
              />
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  if (variant === "lead") {
    return (
      <article className={`group relative grid gap-6 md:grid-cols-12 md:items-end md:gap-10 ${className}`}>
        {story.leadImage ? (
          <div className="md:col-span-7">
            <EditorialImage
              image={story.leadImage}
              aspect="16/10"
              sizes="(min-width: 1280px) 760px, (min-width: 768px) 58vw, 100vw"
              priority={priority}
              decorative
              className="rounded-[2px]"
              imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
            />
          </div>
        ) : null}
        <div className={`${story.leadImage ? "md:col-span-5" : "md:col-span-12"} space-y-4 pb-1`}>
          <Category story={story} />
          <Heading className="font-condensed text-[2.4rem] text-ink sm:text-[3.4rem]">
            <Link href={href} className="after:absolute after:inset-0">
              {story.headline}
            </Link>
          </Heading>
          {story.subtitle || story.summary ? (
            <p className="max-w-md text-[1.05rem] leading-relaxed text-stone">{story.subtitle ?? story.summary}</p>
          ) : null}
          <Meta story={story} />
        </div>
      </article>
    );
  }

  return (
    <article className={`group relative flex flex-col gap-4 ${className}`}>
      {story.leadImage ? (
        <EditorialImage
          image={story.leadImage}
          aspect="16/9"
          sizes="(min-width: 1280px) 420px, (min-width: 768px) 33vw, 100vw"
          priority={priority}
          decorative
          className="rounded-[2px]"
          imageClassName="transition-transform duration-700 group-hover:scale-[1.035]"
        />
      ) : null}
      <div className="space-y-2.5">
        <Category story={story} />
        <Heading className="font-condensed text-[1.75rem] text-ink transition-colors group-hover:text-accent">
          <Link href={href} className="after:absolute after:inset-0">
            {story.headline}
          </Link>
        </Heading>
        {story.summary ? (
          <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-stone">{story.summary}</p>
        ) : null}
        <Meta story={story} />
      </div>
    </article>
  );
}
