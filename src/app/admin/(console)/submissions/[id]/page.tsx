import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionForm } from "@/components/admin/submission-form";
import { AdminHeading, Badge, Card } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { allowedSubmissionTransitions, SUBMISSION_STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";
import { requireEditor } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Submission" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-stone">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-[0.95rem]">{children}</dd>
    </div>
  );
}

export default async function SubmissionDetailPage({ params }: PageProps<"/admin/submissions/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db } = await requireEditor();

  const [{ data: s }, live] = await Promise.all([
    db.from("submissions").select("*, category:categories(name)").eq("id", id).maybeSingle(),
    db
      .from("stories")
      .select("id, headline")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(200),
  ]);
  if (!s) notFound();

  const status = s.status as SubmissionStatus;
  const category = s.category as { name: string } | null;
  const anonymized = Boolean(s.anonymized_at);

  return (
    <>
      <AdminHeading
        title={s.title}
        description={`Received ${formatDateTime(s.created_at)}`}
        actions={<Badge tone={status === "submitted" ? "accent" : "neutral"}>{SUBMISSION_STATUS_LABEL[status]}</Badge>}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <p className="mb-2 text-[0.8rem] text-stone">
            Private. This contains a contributor’s personal details. Don’t copy it into chat, tickets or logs.
          </p>
          <dl className="divide-y divide-line">
            <Row label="Name">{s.name}</Row>
            <Row label="Email">
              {anonymized ? <em className="text-stone">Removed under the retention policy</em> : <a href={`mailto:${s.email}`} className="underline underline-offset-4">{s.email}</a>}
            </Row>
            <Row label="Subject">{s.subject}</Row>
            <Row label="Category">{category?.name ?? "—"}</Row>
            <Row label="Pitch">{s.pitch}</Row>
            <Row label="Portfolio">
              {s.portfolio_url ? (
                <a href={s.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                  {s.portfolio_url}
                </a>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Additional">{s.additional_info ?? "—"}</Row>
            <Row label="Consent">
              Terms version {s.consent_version}, given {formatDateTime(s.consented_at)}
            </Row>
            <Row label="Email alert">{s.notification_status}</Row>
            {s.story_id ? (
              <Row label="Story">
                <Link href={`/admin/stories/${s.story_id}`} className="underline underline-offset-4">
                  Open linked story
                </Link>
              </Row>
            ) : null}
          </dl>
        </Card>
        <Card title="Review">
          <SubmissionForm
            submissionId={s.id}
            current={status}
            allowed={[...allowedSubmissionTransitions(status)]}
            note={s.decision_note ?? ""}
            storyId={s.story_id ?? ""}
            liveStories={live.data ?? []}
          />
        </Card>
      </div>
    </>
  );
}
