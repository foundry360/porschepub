/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import Link from "next/link";
import { MediaUploader } from "@/components/admin/media-uploader";
import { AdminHeading, EmptyRow, Notice, buttonSecondaryClass, inputClass } from "@/components/admin/ui";
import { requireEditor } from "@/server/auth/session";
import { listMedia, MEDIA_PAGE_SIZE } from "@/server/editorial/media-queries";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Media" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const { db } = await requireEditor();
  const params = await searchParams;
  const q = one(params.q).slice(0, 80);
  const page = Math.max(1, Math.min(200, Number.parseInt(one(params.page), 10) || 1));
  const { items, total } = await listMedia(db, { q, page });
  const pages = Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE));

  return (
    <>
      <AdminHeading title="Media" description="Every image needs alt text and a credit. Licence and source notes stay private." />
      <MediaUploader />
      <div className="mb-4 space-y-3">
        {one(params.deleted) ? <Notice tone="success">Image deleted.</Notice> : null}
        {one(params.error) ? <Notice tone="error">{one(params.error).slice(0, 300)}</Notice> : null}
      </div>
      <form role="search" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search media
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search alt text, caption or credit" className={`${inputClass} max-w-md`} />
        <button type="submit" className={buttonSecondaryClass}>
          Search
        </button>
      </form>
      {items.length === 0 ? (
        <EmptyRow>No images yet.</EmptyRow>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/media/${item.id}`} className="block border border-line bg-surface hover:border-ink">
                <span className="block aspect-[4/3] overflow-hidden bg-paper-deep">
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="block px-2 py-2 text-[0.78rem] leading-snug text-stone">
                  {item.alt ? item.alt.slice(0, 80) : <strong className="text-accent">Missing alt text</strong>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-[0.9rem]">
          {page > 1 ? <Link href={`/admin/media?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="underline underline-offset-4">Previous</Link> : <span />}
          <span className="text-stone">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/media?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="underline underline-offset-4">Next</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
