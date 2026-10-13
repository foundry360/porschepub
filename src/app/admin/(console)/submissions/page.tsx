import Link from "next/link";
import { AdminHeading, Badge, EmptyRow } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { SUBMISSION_STATUS_LABEL, SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/workflow";
import { requireEditor } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Submissions" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const { db } = await requireEditor();
  const params = await searchParams;
  const statusParam = one(params.status);
  const status = (SUBMISSION_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as SubmissionStatus) : null;

  let query = db
    .from("submissions")
    .select("id, title, name, status, created_at, notification_status, category:categories(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Submissions load failed: ${error.message}`);

  return (
    <>
      <AdminHeading title="Submissions" description="Pitches from the “Tell your story” form. Nothing here is published automatically." />
      <nav aria-label="Filter submissions" className="mb-6 flex flex-wrap gap-2">
        {[{ value: null, label: "All" }, ...SUBMISSION_STATUSES.map((s) => ({ value: s, label: SUBMISSION_STATUS_LABEL[s] }))].map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/submissions?status=${f.value}` : "/admin/submissions"}
            aria-current={status === f.value ? "page" : undefined}
            className={`border px-3 py-1.5 text-[0.82rem] ${status === f.value ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {!data || data.length === 0 ? (
        <EmptyRow>No submissions here.</EmptyRow>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {data.map((s) => {
            const category = s.category as { name: string } | null;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/submissions/${s.id}`} className="font-medium hover:text-accent">
                    {s.title}
                  </Link>
                  <p className="text-[0.82rem] text-stone">
                    {s.name} · {formatDateTime(s.created_at)}
                    {category ? ` · ${category.name}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.notification_status === "failed" ? <Badge tone="accent">Email alert failed</Badge> : null}
                  <Badge tone={s.status === "submitted" ? "accent" : s.status === "published" ? "ok" : "neutral"}>
                    {SUBMISSION_STATUS_LABEL[s.status as SubmissionStatus]}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
