import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockRenderer } from "@/components/story/block-renderer";
import { PageContainer, PageIntro, SubmitCta } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { getPage } from "@/server/content/public";

export async function pageMetadata(slug: string, canonicalPath: string): Promise<Metadata> {
  const page = await getPage(slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.summary ?? undefined,
    alternates: { canonical: canonicalPath },
  };
}

/** Renders an editor-managed page (About, Privacy, Submission Terms). */
export async function SitePage({ slug, withCta = false }: { slug: string; withCta?: boolean }) {
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <>
      <PageContainer narrow>
        <PageIntro eyebrow={page.kind === "legal" ? "Legal" : undefined} title={page.title} description={page.summary} />
        {page.kind === "legal" && !page.legalReviewed ? (
          <div role="note" className="mb-10 border border-accent/40 bg-paper-deep px-5 py-4 text-[0.9rem] text-charcoal">
            <strong className="font-semibold">Draft pending review.</strong> This page has not yet been
            reviewed by the publisher&rsquo;s legal counsel and may change before launch.
          </div>
        ) : null}
        <BlockRenderer blocks={page.blocks} images={page.images} variant="page" />
        <p className="mt-14 border-t border-line pt-5 text-[0.8rem] text-stone">
          Last updated {formatDate(page.updatedAt)}
        </p>
      </PageContainer>
      {withCta ? (
        <div className="mt-20">
          <SubmitCta variant="dark" />
        </div>
      ) : null}
    </>
  );
}
