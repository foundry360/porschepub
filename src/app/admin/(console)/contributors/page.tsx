import Link from "next/link";
import { AdminHeading, Badge, EmptyRow, Notice, buttonClass } from "@/components/admin/ui";
import { requireEditor } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Contributors" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ContributorsPage({ searchParams }: PageProps<"/admin/contributors">) {
  const { db } = await requireEditor();
  const params = await searchParams;
  const { data, error } = await db
    .from("contributors")
    .select("id, name, slug, descriptor, profile_visible, is_highlighted")
    .order("name");
  if (error) throw new Error(`Contributors load failed: ${error.message}`);

  return (
    <>
      <AdminHeading
        title="Contributors"
        description="People credited on stories. A contributor only gets a public profile page when you turn it on."
        actions={
          <Link href="/admin/contributors/new" className={buttonClass}>
            New contributor
          </Link>
        }
      />
      <div className="mb-4 space-y-3">
        {one(params.saved) ? <Notice tone="success">Contributor saved.</Notice> : null}
        {one(params.deleted) ? <Notice tone="success">Contributor deleted.</Notice> : null}
        {one(params.error) ? <Notice tone="error">{one(params.error).slice(0, 300)}</Notice> : null}
      </div>
      {!data || data.length === 0 ? (
        <EmptyRow>No contributors yet.</EmptyRow>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/admin/contributors/${c.id}`} className="font-medium hover:text-accent">
                  {c.name}
                </Link>
                {c.descriptor ? <p className="text-[0.82rem] text-stone">{c.descriptor}</p> : null}
              </div>
              <div className="flex gap-2">
                {c.profile_visible ? <Badge tone="ok">Public profile</Badge> : <Badge>Byline only</Badge>}
                {c.is_highlighted ? <Badge tone="accent">Highlighted</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
