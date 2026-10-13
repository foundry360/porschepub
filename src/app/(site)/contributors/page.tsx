import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContributorCard } from "@/components/home/contributor-card";
import { EmptyState, PageContainer, PageIntro } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { parsePageParam } from "@/lib/urls";
import { listContributors } from "@/server/content/public";

export const metadata: Metadata = {
  title: "Contributors",
  description: "The owners, racers, restorers, designers and enthusiasts who write for us.",
  alternates: { canonical: "/contributors" },
};

export default function ContributorsPage(props: PageProps<"/contributors">) {
  return (
    <PageContainer>
      <PageIntro
        eyebrow="Voices"
        title="Contributors"
        description="The owners, racers, restorers, designers and enthusiasts who write for us."
      />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <ContributorList searchParams={props.searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function ContributorList({ searchParams }: Pick<PageProps<"/contributors">, "searchParams">) {
  const page = parsePageParam((await searchParams).page);
  const result = await listContributors(page);
  if (page > result.totalPages) notFound();

  if (result.items.length === 0) {
    return (
      <EmptyState title="No contributor profiles yet" action={{ href: "/tell-your-story", label: "Tell your story" }}>
        <p>Profiles appear here as stories are published.</p>
      </EmptyState>
    );
  }

  return (
    <div className="pb-8">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 lg:grid-cols-5">
        {result.items.map((contributor) => (
          <li key={contributor.id}>
            <ContributorCard contributor={contributor} />
          </li>
        ))}
      </ul>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefFor={(n) => (n > 1 ? `/contributors?page=${n}` : "/contributors")}
        label="Contributors pagination"
      />
    </div>
  );
}
