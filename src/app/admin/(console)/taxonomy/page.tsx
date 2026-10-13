import { CategoryForm, TagRenameForm } from "@/components/admin/taxonomy-forms";
import { AdminHeading, Card, Notice, buttonDangerClass } from "@/components/admin/ui";
import { requireEditor } from "@/server/auth/session";
import { deleteCategoryAction, deleteTagAction } from "./actions";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Categories & tags" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function TaxonomyPage({ searchParams }: PageProps<"/admin/taxonomy">) {
  const { db, role } = await requireEditor();
  const params = await searchParams;

  const [cats, tags, catUse, tagUse] = await Promise.all([
    db.from("categories").select("id, name, slug, description, sort_order").order("sort_order").order("name"),
    db.from("tags").select("id, name, slug").order("name"),
    db.from("stories").select("category_id"),
    db.from("story_tags").select("tag_id"),
  ]);
  const catCounts = new Map<string, number>();
  for (const row of catUse.data ?? []) if (row.category_id) catCounts.set(row.category_id, (catCounts.get(row.category_id) ?? 0) + 1);
  const tagCounts = new Map<string, number>();
  for (const row of tagUse.data ?? []) tagCounts.set(row.tag_id, (tagCounts.get(row.tag_id) ?? 0) + 1);

  return (
    <>
      <AdminHeading title="Categories & tags" description="Categories organise the archive and appear in navigation. Tags are lighter-weight topics." />
      <div className="mb-4 space-y-3">
        {one(params.deleted) ? <Notice tone="success">Deleted.</Notice> : null}
        {one(params.error) ? <Notice tone="error">{one(params.error).slice(0, 300)}</Notice> : null}
      </div>

      <h2 className="font-display mb-4 text-[1.6rem]">Categories</h2>
      <div className="space-y-4">
        {(cats.data ?? []).map((c) => (
          <Card key={c.id}>
            <CategoryForm category={{ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", sortOrder: c.sort_order }} />
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[0.85rem] text-stone">
              <span>{catCounts.get(c.id) ?? 0} stories</span>
              {role === "admin" ? (
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={buttonDangerClass}>
                    Delete
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        ))}
        <Card title="Add a category">
          <CategoryForm />
        </Card>
      </div>

      <h2 className="font-display mb-4 mt-14 text-[1.6rem]">Tags</h2>
      {(tags.data ?? []).length === 0 ? (
        <p className="text-stone">No tags yet. Add them from the story editor.</p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {(tags.data ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <TagRenameForm tag={t} />
              <div className="flex items-center gap-4 text-[0.85rem] text-stone">
                <span>
                  {tagCounts.get(t.id) ?? 0} stories · /tags/{t.slug}
                </span>
                <form action={deleteTagAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="underline underline-offset-4 hover:text-accent">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
