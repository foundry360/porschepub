import { AdminHeading, Badge, Card, Notice, buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/dates";
import { requireAdmin } from "@/server/auth/session";
import { changeRoleAction, removeEditorAction } from "./actions";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Team" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function TeamPage({ searchParams }: PageProps<"/admin/team">) {
  const { db, userId } = await requireAdmin();
  const params = await searchParams;
  const { data } = await db.from("profiles").select("id, display_name, role, created_at").order("created_at");

  return (
    <>
      <AdminHeading title="Team" description="People with editorial access. Only listed people can sign in to this area." />
      <div className="mb-4 space-y-3">
        {one(params.saved) ? <Notice tone="success">Saved.</Notice> : null}
        {one(params.error) ? <Notice tone="error">{one(params.error).slice(0, 300)}</Notice> : null}
      </div>
      <ul className="divide-y divide-line border border-line bg-surface">
        {(data ?? []).map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {person.display_name} {person.id === userId ? <Badge>You</Badge> : null}
              </p>
              <p className="text-[0.82rem] text-stone">Added {formatDate(person.created_at)}</p>
            </div>
            {person.id === userId ? (
              <Badge tone="accent">{person.role}</Badge>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <form action={changeRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={person.id} />
                  <label htmlFor={`role-${person.id}`} className="sr-only">
                    Role for {person.display_name}
                  </label>
                  <select id={`role-${person.id}`} name="role" defaultValue={person.role} className={`${inputClass} w-32`}>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className={buttonSecondaryClass}>
                    Set role
                  </button>
                </form>
                <form action={removeEditorAction}>
                  <input type="hidden" name="id" value={person.id} />
                  <button type="submit" className="text-[0.85rem] underline underline-offset-4 hover:text-accent">
                    Remove access
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Card title="Adding people" className="mt-8 max-w-2xl">
        <p className="text-[0.9rem] text-stone">
          New accounts are created by an operator with the provisioning script (<code>npm run admin:create</code>) or in the
          Supabase dashboard, then given a profile here. Public sign-up is disabled so no one can grant themselves access.
          Enable multi-factor authentication for every administrator.
        </p>
      </Card>
    </>
  );
}
