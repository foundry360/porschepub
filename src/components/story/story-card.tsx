import Link from "next/link";
import { EditorialImage } from "@/components/ui/editorial-image";
import { formatDate } from "@/lib/dates";
import type { StorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";

export type CardVariant = "standard" | "lead" | "compact" | "tall";

function Meta({ story, light = false }: { story: StorySummary; light?: boolean }) {
  return (
    <p className={`text-[0.8rem] ${light ? "text-paper/80" : "text-stone"}`}>
      {story.contributor ? <span>By {story.contributor.name}</span> : null}
      {story.contributor ? <span aria-hidden> · </span> : null}
      <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
      <span aria-hidden> · </span>
      <span>{story.readingMinutes} min read</span>
    </p>
  );
}

function Eyebrow({ story }: { story: StorySummary }) {
  if (!story.category) return null;
  return <p className="eyebrow text-accent">{story.category.name}</p>;
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
}: {
  story: StorySummary;
  variant?: CardVariant;
  priority?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = paths.story(story.slug);

  if (variant === "compact") {
    return (
      <article className="group border-t border-line py-6 first:border-t-0 sm:py-7">
        <div className="grid grid-cols-[1fr_auto] gap-5">
          <div className="space-y-2.5">
            <Eyebrow story={story} />
            <Heading className="font-display text-[1.45rem] leading-[1.15] text-ink sm:text-[1.65rem]">
              <Link href={href} className="after:absolute after:inset-0 relative">
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
      <article className="group relative grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
        {story.leadImage ? (
          <div className="md:col-span-7">
            <EditorialImage
              image={story.leadImage}
              aspect="3/2"
              sizes="(min-width: 1280px) 760px, (min-width: 768px) 58vw, 100vw"
              priority={priority}
              decorative
              imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
            />
          </div>
        ) : null}
        <div className={`${story.leadImage ? "md:col-span-5" : "md:col-span-12"} space-y-4 pb-1`}>
          <Eyebrow story={story} />
          <Heading className="font-display text-[2rem] leading-[1.08] text-ink sm:text-[2.6rem]">
            <Link href={href} className="after:absolute after:inset-0">
              {story.headline}
            </Link>
          </Heading>
          {story.subtitle || story.summary ? (
            <p className="max-w-md text-[1.05rem] leading-relaxed text-stone">
              {story.subtitle ?? story.summary}
            </p>
          ) : null}
          <Meta story={story} />
        </div>
      </article>
    );
  }

  const aspect = variant === "tall" ? "4/5" : "4/3";
  return (
    <article className="group relative flex flex-col gap-4">
      {story.leadImage ? (
        <EditorialImage
          image={story.leadImage}
          aspect={aspect}
          sizes="(min-width: 1280px) 420px, (min-width: 768px) 33vw, 100vw"
          priority={priority}
          decorative
          imageClassName="transition-transform duration-700 group-hover:scale-[1.035]"
        />
      ) : null}
      <div className="space-y-2.5">
        <Eyebrow story={story} />
        <Heading className="font-display text-[1.55rem] leading-[1.12] text-ink">
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
