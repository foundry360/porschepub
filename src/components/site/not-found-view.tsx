import Link from "next/link";
import { PageContainer } from "@/components/ui/misc";
import { paths } from "@/lib/urls";

export function NotFoundView() {
  return (
    <PageContainer narrow className="py-28 text-center sm:py-40">
      <p className="eyebrow text-accent">404</p>
      <h1 className="font-headline mt-5 text-[2.8rem] sm:text-[4.2rem]">
        This page has taken a different road
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-[1.05rem] text-stone">
        The story or page you&rsquo;re looking for doesn&rsquo;t exist, hasn&rsquo;t been published, or has moved.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        <Link href={paths.home()} className="bg-ink px-7 py-4 text-sm tracking-wide text-paper hover:bg-brand hover:text-on-brand">
          Back to the homepage
        </Link>
        <Link href={paths.stories()} className="eyebrow link-underline">
          Browse stories
        </Link>
        <Link href={paths.search()} className="eyebrow link-underline">
          Search
        </Link>
      </div>
    </PageContainer>
  );
}
