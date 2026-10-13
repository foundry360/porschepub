import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryView } from "@/components/story/story-view";
import { formatDateTime } from "@/lib/dates";
import { requireEditor } from "@/server/auth/session";
import { loadStoryDetail } from "@/server/content/story-query";
import { storyLifecycle } from "@/lib/workflow";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Preview" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authenticated preview. Uses the EDITOR'S session client so drafts are
 * visible; nothing here is reachable or cacheable by the public, and the
 * route is noindex via the admin layout and response headers.
 */
export default async function StoryPreviewPage({ params }: PageProps<"/admin/stories/[id]/preview">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { db } = await requireEditor();
  const story = await loadStoryDetail(db, { id });
  if (!story) notFound();

  const lifecycle = storyLifecycle(story.status, story.publishedAt);
  const display = { ...story, publishedAt: story.publishedAt ?? new Date().toISOString() };

  return (
    <div className="-mx-5 -my-8 sm:-mx-8 lg:-mx-10 lg:-my-10">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-accent bg-accent px-5 py-3 text-[0.85rem] text-paper">
        <p>
          <strong className="uppercase tracking-[0.14em]">Preview</strong>
          <span className="ml-3">
            {lifecycle === "live"
              ? "This story is live."
              : lifecycle === "scheduled" && story.publishedAt
                ? `Scheduled for ${formatDateTime(story.publishedAt)}. Not public yet.`
                : `This ${lifecycle} is not public.`}
          </span>
        </p>
        <Link href={`/admin/stories/${id}`} className="underline underline-offset-4">
          Back to editor
        </Link>
      </div>
      <StoryView story={display} related={[]} contributor={null} preview />
    </div>
  );
}
