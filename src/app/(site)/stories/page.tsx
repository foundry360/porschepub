import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StoryListing, StoryListingSkeleton } from "@/components/story/story-listing";
import { CategoryNav, PageContainer, PageIntro } from "@/components/ui/misc";
import { parsePageParam, paths } from "@/lib/urls";
import { listCategories, listStories } from "@/server/content/public";

export async function generateMetadata({ searchParams }: PageProps<"/stories">): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);
  return {
    title: page > 1 ? `Stories, page ${page}` : "Stories",
    description: "Every story we have published: first-person accounts from the people behind Porsche.",
    alternates: { canonical: paths.stories(page) },
  };
}

export default function StoriesPage(props: PageProps<"/stories">) {
  return (
    <PageContainer>
      <PageIntro
        eyebrow="Archive"
        title="Stories"
        description="First-person accounts from the people behind Porsche."
      />
      <Suspense fallback={<StoryListingSkeleton />}>
        <StoriesContent searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function StoriesContent({ searchParams }: Pick<PageProps<"/stories">, "searchParams">) {
  const page = parsePageParam((await searchParams).page);
  const [categories, result] = await Promise.all([listCategories(), listStories({ page })]);
  if (page > result.totalPages) notFound();

  return (
    <div className="space-y-12 pb-8">
      <CategoryNav categories={categories} />
      <StoryListing result={result} hrefFor={(n) => paths.stories(n)} />
    </div>
  );
}
