import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StoryListing, StoryListingSkeleton } from "@/components/story/story-listing";
import { PageContainer, PageIntro } from "@/components/ui/misc";
import { parsePageParam, paths } from "@/lib/urls";
import { getTagBySlug, listStories } from "@/server/content/public";

/**
 * Resolve the entity before streaming starts so unknown/unpublished URLs get a
 * real HTTP 404 (and redirects are real 308s) instead of a streamed 200.
 * The data reads are cached, so this does not make the route slow.
 */
export const instant = false;

export async function generateMetadata({ params, searchParams }: PageProps<"/tags/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "Topic not found", robots: { index: false } };
  const page = parsePageParam((await searchParams).page);
  return {
    title: page > 1 ? `${tag.name}, page ${page}` : tag.name,
    description: `Stories tagged “${tag.name}”.`,
    alternates: { canonical: paths.tag(tag.slug, page) },
  };
}

export default async function TagPage(props: PageProps<"/tags/[slug]">) {
  const { slug } = await props.params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  return (
    <PageContainer>
      <PageIntro eyebrow="Topic" title={tag.name} />
      <Suspense fallback={<StoryListingSkeleton />}>
        <TagContent tagId={tag.id} tagSlug={tag.slug} searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function TagContent({
  tagId,
  tagSlug,
  searchParams,
}: {
  tagId: string;
  tagSlug: string;
  searchParams: PageProps<"/tags/[slug]">["searchParams"];
}) {
  const page = parsePageParam((await searchParams).page);
  const result = await listStories({ page, tagId });
  if (page > result.totalPages) notFound();
  return (
    <div className="pb-8">
      <StoryListing result={result} hrefFor={(n) => paths.tag(tagSlug, n)} emptyTitle="No stories with this topic yet" />
    </div>
  );
}
