import Link from "next/link";
import { AdminHeading, Badge, EmptyRow, LifecycleBadge, Notice, buttonClass, buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/dates";
import { requireEditor } from "@/server/auth/session";
import { ADMIN_PAGE_SIZE, listAdminStories, type StoryFilter } from "@/server/editorial/queries";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Stories" };

const FILTERS: Array<{ value: StoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AdminStoriesPage({ searchParams }: PageProps<"/admin/stories">) {
  const { db } = await requireEditor();
  const params = await searchParams;
  const filterParam = one(params.filter);
  const filter = (FILTERS.some((f) => f.value === filterParam) ? filterParam : "all") as StoryFilter;
  const q = one(params.q).slice(0, 80);
  const page = Math.max(1, Math.min(500, Number.parseInt(one(params.page), 10) || 1));

  const { rows, total } = await listAdminStories(db, { filter, q, page });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const qs = (next: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (filter !== "all") sp.set("filter", filter);
    if (q) sp.set("q", q);
    for (const [k, v] of Object.entries(next)) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <AdminHeading
        title="Stories"
        actions={
          <Link href="/admin/stories/new" className={buttonClass}>
            New story
          </Link>
        }
      />
      {one(params.deleted) ? <div className="mb-4"><Notice tone="success">Story deleted.</Notice></div> : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter stories" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/stories${f.value === "all" ? "" : `?filter=${f.value}`}`}
              aria-current={filter === f.value ? "page" : undefined}
              className={`border px-3 py-1.5 text-[0.82rem] ${filter === f.value ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form role="search" className="flex gap-2">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <label htmlFor="q" className="sr-only">
            Search stories
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Search headline or slug" className={`${inputClass} w-64`} />
          <button type="submit" className={buttonSecondaryClass}>
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyRow>No stories match.</EmptyRow>
      ) : (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-[0.92rem]">
            <thead className="border-b border-line bg-paper-deep text-[0.72rem] uppercase tracking-[0.12em] text-stone">
              <tr>
                <th scope="col" className="px-4 py-3">Story</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Published</th>
                <th scope="col" className="px-4 py-3">Edited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((story) => (
                <tr key={story.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/stories/${story.id}`} className="font-medium hover:text-accent">
                      {story.headline || "Untitled"}
                    </Link>
                    <p className="text-[0.8rem] text-stone">
                      {story.contributorName ?? "No contributor"}
                      {story.categoryName ? <> · <Badge>{story.categoryName}</Badge></> : null}
                    </p>
                  </td>
                  <td className="px-4 py-3"><LifecycleBadge lifecycle={story.lifecycle} /></td>
                  <td className="px-4 py-3 text-stone">{story.publishedAt ? formatDate(story.publishedAt) : "—"}</td>
                  <td className="px-4 py-3 text-stone">{formatDate(story.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-[0.9rem]">
          {page > 1 ? <Link href={`/admin/stories${qs({ page: page - 1 })}`} className="underline underline-offset-4">Previous</Link> : <span />}
          <span className="text-stone">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/stories${qs({ page: page + 1 })}`} className="underline underline-offset-4">Next</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
