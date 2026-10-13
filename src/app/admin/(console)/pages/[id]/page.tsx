import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/page-form";
import { AdminHeading } from "@/components/admin/ui";
import { collectImageAssetIds, parseBodyForRender } from "@/lib/content/blocks";
import { requireEditor } from "@/server/auth/session";
import { getMediaByIds } from "@/server/editorial/media-queries";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Edit page" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPage({ params }: PageProps<"/admin/pages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db } = await requireEditor();
  const { data: page } = await db.from("pages").select("*").eq("id", id).maybeSingle();
  if (!page) notFound();

  const { blocks } = parseBodyForRender(page.body);
  const media = await getMediaByIds(db, collectImageAssetIds(blocks));
  const images = Object.fromEntries(Object.values(media).map((m) => [m.id, { id: m.id, url: m.url, alt: m.alt }]));

  return (
    <>
      <AdminHeading title={page.title} description={`Public address: /${page.slug}`} />
      <PageForm
        images={images}
        page={{
          id: page.id,
          slug: page.slug,
          kind: page.kind === "legal" || page.kind === "about" ? page.kind : "general",
          title: page.title,
          summary: page.summary ?? "",
          body: blocks,
          legalReviewed: page.legal_reviewed,
          isPublished: page.is_published,
          seoTitle: page.seo_title ?? "",
          seoDescription: page.seo_description ?? "",
        }}
      />
    </>
  );
}
