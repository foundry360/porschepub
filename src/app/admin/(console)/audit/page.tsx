import { AdminHeading, EmptyRow } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { requireAdmin } from "@/server/auth/session";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const { db } = await requireAdmin();
  const { data: entries } = await db
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const { data: people } = await db.from("profiles").select("id, display_name");
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name]));

  return (
    <>
      <AdminHeading title="Audit log" description="The most recent 200 editorial actions. Entries are append-only." />
      {!entries || entries.length === 0 ? (
        <EmptyRow>Nothing recorded yet.</EmptyRow>
      ) : (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[44rem] text-left text-[0.88rem]">
            <thead className="border-b border-line bg-paper-deep text-[0.72rem] uppercase tracking-[0.12em] text-stone">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Who</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Record</th>
                <th scope="col" className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-stone">{formatDateTime(entry.created_at)}</td>
                  <td className="px-4 py-2">{entry.actor_id ? (names.get(entry.actor_id) ?? "Former member") : "System"}</td>
                  <td className="px-4 py-2 font-medium">{entry.action}</td>
                  <td className="px-4 py-2 text-stone">{entry.entity_type}</td>
                  <td className="px-4 py-2 text-[0.8rem] text-stone">
                    {Object.entries((entry.details ?? {}) as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
