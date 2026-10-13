import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TrackEvent } from "@/components/analytics/track-event";
import { StoryListing, StoryListingSkeleton } from "@/components/story/story-listing";
import { CategoryNav, JsonLd, PageContainer, PageIntro } from "@/components/ui/misc";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { parsePageParam, paths } from "@/lib/urls";
import { getCategoryBySlug, listCategories, listStories } from "@/server/content/public";

/**
 * Resolve the entity before streaming starts so unknown/unpublished URLs get a
 * real HTTP 404 (and redirects are real 308s) instead of a streamed 200.
 * The data reads are cached, so this does not make the route slow.
 */
export const instant = false;

export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const page = parsePageParam((await searchParams).page);
  return {
    title: page > 1 ? `${category.name}, page ${page}` : category.name,
    description:
      category.description ?? `Stories in ${category.name}: first-person accounts from the people behind Porsche.`,
    alternates: { canonical: paths.category(category.slug, page) },
  };
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  // Resolved before any Suspense boundary so unknown categories get a real 404.
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <PageContainer>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Stories", path: paths.stories() },
          { name: category.name, path: paths.category(category.slug) },
        ])}
      />
      <TrackEvent event="Category Navigation" props={{ category: category.slug }} />
      <PageIntro eyebrow="Category" title={category.name} description={category.description} />
      <Suspense fallback={<StoryListingSkeleton />}>
        <CategoryContent
          categoryId={category.id}
          categorySlug={category.slug}
          searchParams={props.searchParams}
        />
      </Suspense>
    </PageContainer>
  );
}

async function CategoryContent({
  categoryId,
  categorySlug,
  searchParams,
}: {
  categoryId: string;
  categorySlug: string;
  searchParams: PageProps<"/categories/[slug]">["searchParams"];
}) {
  const page = parsePageParam((await searchParams).page);
  const [categories, result] = await Promise.all([listCategories(), listStories({ page, categoryId })]);
  if (page > result.totalPages) notFound();

  return (
    <div className="space-y-12 pb-8">
      <CategoryNav categories={categories} activeSlug={categorySlug} />
      <StoryListing
        result={result}
        hrefFor={(n) => paths.category(categorySlug, n)}
        emptyTitle="No stories in this category yet"
        emptyMessage="We haven’t published a story here yet. Have one to tell?"
      />
    </div>
  );
}
