"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnails are small, authenticated-context previews */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getBrowserClient } from "@/lib/supabase-browser";
import { finalizeUploadAction, requestUploadPathAction } from "@/app/admin/(console)/media/actions";
import { listMediaAction } from "@/app/admin/(console)/media/picker-actions";
import type { MediaListItem } from "@/server/editorial/media-queries";
import { buttonClass, buttonSecondaryClass, Field, inputClass, Notice } from "./ui";

export type PickedImage = { id: string; url: string; alt: string };

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (image: PickedImage) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"library" | "upload">("library");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="media-picker-title"
      className="m-auto w-[min(60rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto border border-ink bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      {open ? (
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id="media-picker-title" className="font-display text-[1.8rem] leading-none">
              Choose an image
            </h2>
            <button type="button" onClick={onClose} className={buttonSecondaryClass}>
              Close
            </button>
          </div>
          <div role="tablist" aria-label="Image source" className="mb-5 flex gap-2">
            {(["library", "upload"] as const).map((value) => (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`border px-4 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.1em] ${tab === value ? "border-ink bg-ink text-paper" : "border-line bg-surface"}`}
              >
                {value === "library" ? "Library" : "Upload new"}
              </button>
            ))}
          </div>
          {tab === "library" ? (
            <Library onSelect={onSelect} />
          ) : (
            <Upload
              onUploaded={(image) => {
                onSelect(image);
              }}
            />
          )}
        </div>
      ) : null}
    </dialog>
  );
}

function Library({ onSelect }: { onSelect: (image: PickedImage) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback((q: string, nextPage: number, append: boolean) => {
    startTransition(async () => {
      try {
        const result = await listMediaAction(q, nextPage);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(nextPage);
        setError(null);
      } catch {
        setError("The library couldn’t be loaded.");
      }
    });
  }, []);

  useEffect(() => {
    load("", 1, false);
  }, [load]);

  return (
    <div>
      <form
        role="search"
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          load(query, 1, false);
        }}
      >
        <label htmlFor="media-search" className="sr-only">
          Search the library
        </label>
        <input
          id="media-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search alt text, caption or credit"
          className={inputClass}
        />
        <button type="submit" className={buttonSecondaryClass}>
          Search
        </button>
      </form>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {items.length === 0 && !pending ? (
        <p className="py-10 text-center text-stone">No images yet. Use “Upload new”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect({ id: item.id, url: item.url, alt: item.alt })}
                className="group block w-full border border-line bg-surface text-left hover:border-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="block aspect-[4/3] overflow-hidden bg-paper-deep">
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="block px-2 py-2 text-[0.78rem] leading-snug text-stone">
                  {item.alt ? item.alt.slice(0, 70) : <em className="text-accent">No alt text</em>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasMore ? (
        <div className="mt-5 text-center">
          <button type="button" disabled={pending} onClick={() => load(query, page + 1, true)} className={buttonSecondaryClass}>
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Upload({ onUploaded }: { onUploaded: (image: PickedImage) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!file) return setError("Choose an image file.");
    if (!ACCEPT.split(",").includes(file.type)) return setError("Use a JPEG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return setError("That file is larger than 15 MB.");
    if (!alt.trim()) return setFieldErrors({ altText: "Describe the image for people who can’t see it." });
    if (!credit.trim()) return setFieldErrors({ credit: "Record who made or owns this image." });

    setBusy(true);
    try {
      const { path } = await requestUploadPathAction();
      const { error: uploadError } = await getBrowserClient()
        .storage.from("editorial-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error("The upload failed. Check your connection and try again.");

      const result = await finalizeUploadAction({
        path,
        altText: alt,
        caption,
        credit,
        licenseNote,
        sourceNote,
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        throw new Error(result.error);
      }
      onUploaded({ id: result.asset.id, url: result.asset.url, alt: result.asset.alt });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field label="Image file" htmlFor="upload-file" hint="JPEG, PNG, WebP or AVIF, up to 15 MB. Location and camera metadata are removed automatically.">
        <input
          id="upload-file"
          type="file"
          accept={ACCEPT}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-[0.9rem]"
        />
      </Field>
      <Field label="Alt text" htmlFor="upload-alt" required error={fieldErrors.altText} hint="Describe what the image shows, concisely.">
        <textarea id="upload-alt" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={500} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Credit" htmlFor="upload-credit" required error={fieldErrors.credit} hint="Photographer or rights holder.">
          <input id="upload-credit" value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={200} className={inputClass} />
        </Field>
        <Field label="Caption" htmlFor="upload-caption" error={fieldErrors.caption}>
          <input id="upload-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Licence note (private)" htmlFor="upload-license" hint="Terms, expiry, usage limits. Never shown publicly.">
          <textarea id="upload-license" rows={2} value={licenseNote} onChange={(e) => setLicenseNote(e.target.value)} maxLength={1000} className={inputClass} />
        </Field>
        <Field label="Source note (private)" htmlFor="upload-source" hint="Where the file came from. Never shown publicly.">
          <textarea id="upload-source" rows={2} value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} maxLength={1000} className={inputClass} />
        </Field>
      </div>
      <p className="text-[0.82rem] text-stone">
        Only upload images you have the right to publish. Do not upload imagery from Porsche AG or other third parties
        without a licence.
      </p>
      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? "Uploading…" : "Upload and use image"}
      </button>
    </form>
  );
}
