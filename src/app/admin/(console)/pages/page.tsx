import Link from "next/link";
import { AdminHeading, Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/dates";
import { requireEditor } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  const { db } = await requireEditor();
  const { data, error } = await db
    .from("pages")
    .select("id, slug, title, kind, legal_reviewed, is_published, updated_at")
    .order("kind")
    .order("title");
  if (error) throw new Error(`Pages load failed: ${error.message}`);

  return (
    <>
      <AdminHeading title="Pages" description="About, privacy and submission terms. These are fixed pages; edit their content here." />
      <ul className="divide-y divide-line border border-line bg-surface">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <Link href={`/admin/pages/${p.id}`} className="font-medium hover:text-accent">
                {p.title}
              </Link>
              <p className="text-[0.82rem] text-stone">/{p.slug} · edited {formatDate(p.updated_at)}</p>
            </div>
            <div className="flex gap-2">
              {p.kind === "legal" ? (p.legal_reviewed ? <Badge tone="ok">Legal reviewed</Badge> : <Badge tone="accent">Needs legal review</Badge>) : null}
              {p.is_published ? <Badge>Published</Badge> : <Badge tone="accent">Hidden</Badge>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
