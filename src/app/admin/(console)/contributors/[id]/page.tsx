import { notFound } from "next/navigation";
import { ContributorForm } from "@/components/admin/contributor-form";
import { AdminHeading, Card, buttonDangerClass } from "@/components/admin/ui";
import { requireEditor } from "@/server/auth/session";
import { getMediaByIds } from "@/server/editorial/media-queries";
import { deleteContributorAction } from "../actions";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Edit contributor" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditContributorPage({ params }: PageProps<"/admin/contributors/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db, role } = await requireEditor();

  const [{ data: c }, { data: priv }, { count }] = await Promise.all([
    db.from("contributors").select("*").eq("id", id).maybeSingle(),
    db.from("contributor_private").select("email, notes").eq("contributor_id", id).maybeSingle(),
    db.from("stories").select("id", { count: "exact", head: true }).eq("contributor_id", id),
  ]);
  if (!c) notFound();

  const assetIds = [c.avatar_asset_id, c.cover_asset_id].filter((id): id is string => Boolean(id));
  const media = assetIds.length > 0 ? await getMediaByIds(db, assetIds) : {};
  const info = (id: string | null) => (id && media[id] ? { id, url: media[id].url, alt: media[id].alt } : null);
  const avatar = info(c.avatar_asset_id);
  const cover = info(c.cover_asset_id);

  return (
    <>
      <AdminHeading title={c.name} description={`${count ?? 0} stor${count === 1 ? "y" : "ies"} credited.`} />
      <ContributorForm
        avatar={avatar}
        cover={cover}
        values={{
          id: c.id,
          name: c.name,
          slug: c.slug,
          descriptor: c.descriptor ?? "",
          bio: c.bio ?? "",
          expertise: (c.expertise ?? []).join(", "),
          websiteUrl: c.website_url ?? "",
          socialUrl: c.social_url ?? "",
          profileVisible: c.profile_visible,
          isHighlighted: c.is_highlighted,
          email: priv?.email ?? "",
          notes: priv?.notes ?? "",
        }}
      />
      {role === "admin" ? (
        <Card title="Danger zone" className="mt-10 max-w-xl">
          <p className="mb-3 text-[0.88rem] text-stone">
            Deleting is blocked while stories are credited to this contributor.
          </p>
          <form action={deleteContributorAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="slug" value={c.slug} />
            <button type="submit" className={buttonDangerClass}>
              Delete contributor
            </button>
          </form>
        </Card>
      ) : null}
    </>
  );
}
