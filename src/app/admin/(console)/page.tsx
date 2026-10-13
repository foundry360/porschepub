import Link from "next/link";
import { AdminHeading, Badge, Card, LifecycleBadge, Notice, buttonClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/dates";
import { requireEditor } from "@/server/auth/session";
import { getDashboardCounts, listAdminStories } from "@/server/editorial/queries";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Dashboard" };

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block border border-line bg-surface p-5 hover:border-ink">
      <p className="font-display text-[2.6rem] leading-none">{value}</p>
      <p className="mt-2 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-stone">{label}</p>
    </Link>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { db, displayName } = await requireEditor();
  const { denied } = await searchParams;

  const [counts, recent, legal, hero] = await Promise.all([
    getDashboardCounts(db),
    listAdminStories(db, { filter: "all", q: "", page: 1 }),
    db.from("pages").select("slug, title").eq("kind", "legal").eq("legal_reviewed", false),
    db.from("homepage_placements").select("id", { count: "exact", head: true }),
  ]);

  const unreviewed = legal.data ?? [];

  return (
    <>
      <AdminHeading
        title={`Welcome, ${displayName.split(" ")[0]}`}
        description="What needs attention in the newsroom."
        actions={
          <Link href="/admin/stories/new" className={buttonClass}>
            New story
          </Link>
        }
      />

      <div className="space-y-4">
        {denied ? <Notice tone="warning">That area is only available to administrators.</Notice> : null}
        {unreviewed.length > 0 ? (
          <Notice tone="warning">
            <strong>Legal review pending:</strong>{" "}
            {unreviewed.map((p, i) => (
              <span key={p.slug}>
                {i > 0 ? ", " : ""}
                <Link href="/admin/pages" className="underline underline-offset-4">
                  {p.title}
                </Link>
              </span>
            ))}{" "}
            {unreviewed.length === 1 ? "is" : "are"} draft text and hasn’t been marked as reviewed by counsel. It should be
            reviewed before launch.
          </Notice>
        ) : null}
        {counts.live > 0 && (hero.count ?? 0) === 0 ? (
          <Notice>
            No homepage selections yet. The homepage is showing your newest stories automatically.{" "}
            <Link href="/admin/homepage" className="underline underline-offset-4">
              Choose them
            </Link>
          </Notice>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="New submissions" value={counts.newSubmissions} href="/admin/submissions?status=submitted" />
        <Stat label="In review" value={counts.inReview} href="/admin/submissions?status=in_review" />
        <Stat label="Drafts" value={counts.drafts} href="/admin/stories?filter=draft" />
        <Stat label="Scheduled" value={counts.scheduled} href="/admin/stories?filter=scheduled" />
        <Stat label="Live" value={counts.live} href="/admin/stories?filter=live" />
        <Stat label="Archived" value={counts.archived} href="/admin/stories?filter=archived" />
      </div>

      <Card title="Recently edited" className="mt-10">
        {recent.rows.length === 0 ? (
          <p className="text-stone">No stories yet. Start with “New story”.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.rows.slice(0, 8).map((story) => (
              <li key={story.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/stories/${story.id}`} className="font-medium hover:text-accent">
                    {story.headline || "Untitled"}
                  </Link>
                  <p className="text-[0.82rem] text-stone">
                    {story.contributorName ?? "No contributor"} · edited {formatDate(story.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {story.categoryName ? <Badge>{story.categoryName}</Badge> : null}
                  <LifecycleBadge lifecycle={story.lifecycle} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
