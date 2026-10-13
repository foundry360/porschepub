import Link from "next/link";
import type { ReactNode } from "react";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import type { CategorySummary } from "@/lib/types";
import { paths } from "@/lib/urls";

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
    <div className="flex items-end justify-between gap-6 border-b border-ink pb-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-2 text-accent">{eyebrow}</p> : null}
        <Heading id={id} className="font-display text-[1.9rem] leading-none sm:text-[2.4rem]">
          {title}
        </Heading>
      </div>
      {href ? (
        <Link href={href} className="eyebrow link-underline shrink-0 pb-1">
          {hrefLabel ?? "View all"}
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
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
}) {
  return (
    <div className="animate-fade-up pb-10 pt-14 sm:pb-14 sm:pt-20">
      {eyebrow ? <p className="eyebrow mb-4 text-accent">{eyebrow}</p> : null}
      <h1 className="font-display max-w-4xl text-[2.6rem] leading-[1.02] sm:text-[4.2rem]">{title}</h1>
      {description ? (
        <p className="mt-6 max-w-2xl text-[1.15rem] leading-relaxed text-stone">{description}</p>
      ) : null}
    </div>
  );
}

export function CategoryNav({
  categories,
  activeSlug,
}: {
  categories: readonly CategorySummary[];
  activeSlug?: string;
}) {
  return (
    <nav aria-label="Categories" className="border-y border-line">
      <ul className="-mx-5 flex gap-x-7 overflow-x-auto px-5 py-3.5 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link
            href={paths.stories()}
            aria-current={!activeSlug ? "page" : undefined}
            className={`eyebrow whitespace-nowrap pb-1 ${!activeSlug ? "border-b border-ink text-ink" : "text-stone hover:text-ink"}`}
          >
            All stories
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={paths.category(category.slug)}
              aria-current={activeSlug === category.slug ? "page" : undefined}
              className={`eyebrow whitespace-nowrap pb-1 ${activeSlug === category.slug ? "border-b border-ink text-ink" : "text-stone hover:text-ink"}`}
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
    <div className="border border-dashed border-line px-6 py-16 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      {children ? <div className="mx-auto mt-3 max-w-md text-stone">{children}</div> : null}
      {action ? (
        <Link href={action.href} className="eyebrow link-underline mt-6 inline-block">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function SubmitCta({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const dark = variant === "dark";
  return (
    <section
      aria-labelledby="submit-cta-heading"
      className={`${dark ? "on-dark bg-ink text-paper" : "bg-paper-deep text-ink"}`}
    >
      <div className="mx-auto grid max-w-[88rem] gap-8 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className={`eyebrow mb-4 ${dark ? "text-[#d9b9a8]" : "text-accent"}`}>Tell your story</p>
          <h2
            id="submit-cta-heading"
            className="font-display max-w-3xl text-[2.3rem] leading-[1.05] sm:text-[3.4rem]"
          >
            Every Porsche has a story. What&rsquo;s yours?
          </h2>
          <p className={`mt-5 max-w-xl text-[1.05rem] ${dark ? "text-paper/75" : "text-stone"}`}>
            Owners, racers, restorers, designers and enthusiasts: tell us about the car, the road, or
            the people who made it matter.
          </p>
        </div>
        <div className="md:col-span-4 md:text-right">
          <Link
            href={paths.tellYourStory()}
            className={`inline-block px-7 py-4 text-sm tracking-wide transition-colors ${
              dark ? "bg-paper text-ink hover:bg-[#d9b9a8]" : "bg-ink text-paper hover:bg-charcoal"
            }`}
          >
            Pitch a story
          </Link>
        </div>
      </div>
    </section>
  );
}
