import Link from "next/link";
import { EditorialImage } from "@/components/ui/editorial-image";
import type { ContributorSummary } from "@/lib/types";
import { paths } from "@/lib/urls";

export function ContributorCard({ contributor }: { contributor: ContributorSummary }) {
  const content = (
    <>
      {contributor.avatar ? (
        <EditorialImage
          image={contributor.avatar}
          aspect="4/5"
          sizes="(min-width: 1024px) 300px, 45vw"
          decorative
          className="rounded-[12px]"
          imageClassName="grayscale transition duration-700 group-hover:grayscale-0"
        />
      ) : (
        <div
          aria-hidden
          className="font-display flex aspect-[4/5] items-center justify-center rounded-[12px] bg-paper-deep text-7xl italic text-stone"
        >
          {contributor.name.charAt(0)}
        </div>
      )}
      <div className="px-1 pb-1 pt-5">
        <h3 className="font-headline text-[1.5rem] transition-colors group-hover:text-accent">{contributor.name}</h3>
        {contributor.descriptor ? (
          <p className="font-display mt-1.5 text-[1.1rem] italic leading-snug text-stone">{contributor.descriptor}</p>
        ) : null}
        {contributor.hasProfile ? (
          <p aria-hidden className="eyebrow mt-5 text-stone">
            Read profile <span className="text-accent">→</span>
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="group relative h-full rounded-[20px] border border-line p-3 transition-colors hover:border-stone">
      {contributor.hasProfile ? (
        <Link
          href={paths.contributor(contributor.slug)}
          className="block after:absolute after:inset-0"
          aria-label={`${contributor.name}, contributor profile`}
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </article>
  );
}
