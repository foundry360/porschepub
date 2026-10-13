import Link from "next/link";
import type { ReactNode } from "react";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import type { CategorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";
import { Pill } from "./pill";

export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      // Safe: serializeJsonLd escapes "<" and line separators.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function SectionHeader({
  eyebrow,
  title,
  href,
  hrefLabel,
  level = 2,
  id,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  level?: 1 | 2;
  id?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex items-end justify-between gap-6 border-t border-line pt-6">
      <div>
        {eyebrow ? <p className="eyebrow eyebrow-slash mb-3 text-stone">{eyebrow}</p> : null}
        <Heading id={id} className="font-condensed text-[2rem] sm:text-[2.75rem]">
          {title}
        </Heading>
      </div>
      {href ? (
        <Link href={href} className="eyebrow shrink-0 pb-1 text-stone transition-colors hover:text-accent">
          {hrefLabel ?? "View all"} <span aria-hidden>→</span>
        </Link>
      ) : null}
    </div>
  );
}

export function PageContainer({
  children,
  narrow = false,
  className = "",
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div className={`mx-auto px-5 sm:px-8 ${narrow ? "max-w-3xl" : "max-w-[88rem]"} ${className}`}>
      {children}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  emphasis,
  description,
}: {
  eyebrow?: string;
  title: string;
  /** Trailing words set in italic serif, e.g. title "Tell your" + emphasis "story." */
  emphasis?: string;
  description?: string | null;
}) {
  return (
    <div className="animate-fade-up pb-12 pt-16 sm:pb-16 sm:pt-24">
      {eyebrow ? <p className="eyebrow eyebrow-slash mb-6 text-stone">{eyebrow}</p> : null}
      <h1 className="font-headline max-w-5xl text-[clamp(2.9rem,8.5vw,8rem)]">
        {title}
        {emphasis ? (
          <>
            {" "}
            <em>{emphasis}</em>
          </>
        ) : null}
      </h1>
      {description ? (
        <p className="mt-8 max-w-2xl text-[clamp(1.1rem,1.6vw,1.45rem)] leading-snug text-stone">{description}</p>
      ) : null}
    </div>
  );
}

function chipClass(active: boolean): string {
  return `inline-block whitespace-nowrap rounded-full border px-4 py-2 text-[0.8125rem] transition-colors ${
    active ? "border-ink bg-ink text-paper" : "border-line text-stone hover:border-accent hover:text-ink"
  }`;
}

export function CategoryNav({
  categories,
  activeSlug,
}: {
  categories: readonly CategorySummary[];
  activeSlug?: string;
}) {
  return (
    <nav aria-label="Categories">
      <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link
            href={paths.stories()}
            aria-current={!activeSlug ? "page" : undefined}
            className={chipClass(!activeSlug)}
          >
            All stories
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={paths.category(category.slug)}
              aria-current={activeSlug === category.slug ? "page" : undefined}
              className={chipClass(activeSlug === category.slug)}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-line px-6 py-16 text-center">
      <h2 className="font-headline text-[1.75rem]">{title}</h2>
      {children ? <div className="mx-auto mt-3 max-w-md text-stone">{children}</div> : null}
      {action ? (
        <Pill href={action.href} variant="outline" className="mt-7">
          {action.label}
        </Pill>
      ) : null}
    </div>
  );
}

/** Closing call to action: always dark, with the red glow. */
export function SubmitCta() {
  return (
    <section aria-labelledby="submit-cta-heading" className="submit-cta on-dark glow-accent bg-ink text-paper">
      <div className="mx-auto max-w-[88rem] px-5 py-24 text-center sm:px-8 sm:py-36">
        <p className="eyebrow eyebrow-slash text-paper/70">Tell your story</p>
        <h2
          id="submit-cta-heading"
          className="font-headline mx-auto mt-6 max-w-5xl text-[clamp(2.8rem,8vw,7.5rem)]"
        >
          Your Porsche story <em>belongs here.</em>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-[1.1rem] leading-relaxed text-paper/75">
          Owners, racers, restorers, designers and enthusiasts: tell us about the car, the road, or the
          people who made it matter. You don&rsquo;t need to be a writer.
        </p>
        <Pill href={paths.tellYourStory()} variant="inverse" className="mt-10">
          Pitch a story
        </Pill>
      </div>
    </section>
  );
}
