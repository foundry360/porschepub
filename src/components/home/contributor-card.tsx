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
          aspect="1/1"
          sizes="(min-width: 1024px) 220px, 45vw"
          decorative
          imageClassName="grayscale transition duration-700 group-hover:grayscale-0"
        />
      ) : (
        <div
          aria-hidden
          className="font-display flex aspect-square items-center justify-center bg-paper-deep text-6xl text-stone"
        >
          {contributor.name.charAt(0)}
        </div>
      )}
      <div className="mt-4">
        <h3 className="font-display text-xl leading-tight">{contributor.name}</h3>
        {contributor.descriptor ? (
          <p className="mt-1 text-[0.85rem] text-stone">{contributor.descriptor}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="group relative">
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
