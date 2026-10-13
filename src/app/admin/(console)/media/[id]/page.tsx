/* eslint-disable @next/next/no-img-element -- admin preview */
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaEditForm } from "@/components/admin/media-edit-form";
import { AdminHeading, Card, buttonDangerClass } from "@/components/admin/ui";
import { mediaPublicUrl } from "@/lib/media";
import { requireEditor } from "@/server/auth/session";
import { mediaUsage } from "@/server/editorial/media";
import { deleteMediaAction } from "../actions";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Image" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MediaDetailPage({ params }: PageProps<"/admin/media/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db, role } = await requireEditor();

  const [{ data: asset }, { data: priv }, usage] = await Promise.all([
    db.from("media_assets").select("*").eq("id", id).maybeSingle(),
    db.from("media_asset_private").select("license_note, source_note").eq("asset_id", id).maybeSingle(),
    mediaUsage(db, id),
  ]);
  if (!asset) notFound();

  return (
    <>
      <AdminHeading title="Image details" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          <img
            src={mediaPublicUrl(asset.bucket, asset.storage_path)}
            alt={asset.alt_text}
            width={asset.width}
            height={asset.height}
            className="max-h-[70vh] w-auto border border-line"
          />
          <p className="mt-3 text-[0.85rem] text-stone">
            {asset.width} × {asset.height} · {(asset.byte_size / 1024).toFixed(0)} KB · {asset.mime_type}
          </p>
          <Card title="Used in" className="mt-6">
            {usage.length === 0 ? (
              <p className="text-[0.9rem] text-stone">Not used anywhere. Safe to delete.</p>
            ) : (
              <ul className="space-y-1 text-[0.9rem]">
                {usage.map((u) => (
                  <li key={`${u.kind}-${u.id}`}>
                    <Link
                      href={u.kind === "story" ? `/admin/stories/${u.id}` : `/admin/contributors/${u.id}`}
                      className="underline underline-offset-4"
                    >
                      {u.label}
                    </Link>{" "}
                    <span className="text-stone">({u.kind})</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <MediaEditForm
              asset={{
                id: asset.id,
                altText: asset.alt_text,
                caption: asset.caption ?? "",
                credit: asset.credit ?? "",
                licenseNote: priv?.license_note ?? "",
                sourceNote: priv?.source_note ?? "",
              }}
            />
          </Card>
          {role === "admin" ? (
            <Card title="Danger zone">
              <form action={deleteMediaAction}>
                <input type="hidden" name="id" value={asset.id} />
                <button type="submit" className={buttonDangerClass}>
                  Delete image
                </button>
              </form>
              <p className="mt-2 text-[0.8rem] text-stone">Blocked while the image is in use.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
