"use client";

import { useEffect, useRef, useState } from "react";
import { SUBMISSION_IMAGE_LIMITS } from "@/lib/validation/submission";

type Photo = { id: string; file: File; url: string };

const L = SUBMISSION_IMAGE_LIMITS;
const ATTEMPTS = [
  { edge: L.maxEdge, quality: 0.85 },
  { edge: L.maxEdge, quality: 0.72 },
  { edge: 1600, quality: 0.72 },
  { edge: 1280, quality: 0.68 },
];

class UnreadableImageError extends Error {}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Downsize and re-encode a photo as JPEG so several fit in one request. */
async function downsize(file: File, index: number): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnreadableImageError();
  }
  try {
    for (const { edge, quality } of ATTEMPTS) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new UnreadableImageError();
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= L.maxBytesEach * 0.95) {
        return new File([blob], `photo-${index + 1}.jpg`, { type: "image/jpeg" });
      }
    }
  } finally {
    bitmap.close();
  }
  throw new UnreadableImageError();
}

export function PhotoPicker({ error, syncKey }: { error?: string; syncKey: unknown }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const carrierRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);

  // The hidden input carries the downsized files in the form submission. React
  // resets form fields after each action, so re-attach them whenever state changes.
  useEffect(() => {
    photosRef.current = photos;
    const carrier = carrierRef.current;
    if (!carrier) return;
    const transfer = new DataTransfer();
    for (const photo of photos) transfer.items.add(photo.file);
    carrier.files = transfer.files;
  }, [photos, syncKey]);

  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"));
    if (incoming.length === 0) {
      setLocalError("Please choose JPEG, PNG or WebP photos.");
      return;
    }
    const room = L.maxCount - photos.length;
    if (room <= 0) {
      setLocalError(`You can attach up to ${L.maxCount} photos.`);
      return;
    }
    setBusy(true);
    setLocalError(null);
    const added: Photo[] = [];
    let skipped = 0;
    for (const file of incoming.slice(0, room)) {
      try {
        const small = await downsize(file, photos.length + added.length);
        added.push({ id: crypto.randomUUID(), file: small, url: URL.createObjectURL(small) });
      } catch {
        skipped += 1;
      }
    }
    const total = [...photos, ...added].reduce((sum, photo) => sum + photo.file.size, 0);
    if (total > L.maxTotalBytes) {
      added.forEach((photo) => URL.revokeObjectURL(photo.url));
      setLocalError("Those photos are too large to send together. Please try fewer photos.");
    } else {
      setPhotos((current) => [...current, ...added]);
      const messages: string[] = [];
      if (skipped > 0) messages.push(`${skipped === 1 ? "One photo" : `${skipped} photos`} couldn’t be read. Try exporting it as a JPEG.`);
      if (incoming.length > room) messages.push(`Only ${L.maxCount} photos can be attached.`);
      setLocalError(messages.join(" ") || null);
    }
    setBusy(false);
  }

  function remove(id: string) {
    setPhotos((current) => {
      const photo = current.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((p) => p.id !== id);
    });
    setLocalError(null);
  }

  const message = localError ?? error;
  const full = photos.length >= L.maxCount;

  return (
    <div>
      <p id="field-images-label" className="eyebrow block text-stone">
        Photos <span className="normal-case tracking-normal text-mist">(optional)</span>
      </p>
      <p id="field-images-hint" className="mt-1 text-[0.85rem] text-stone">
        Up to {L.maxCount} photos of the car, the people or the places in your story. Large photos are resized
        automatically, and location data is removed.
      </p>

      <input
        ref={pickerRef}
        type="file"
        accept={L.acceptedTypes.join(",")}
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input ref={carrierRef} type="file" name="images" multiple hidden tabIndex={-1} aria-hidden />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!full && event.dataTransfer.files.length) void addFiles(event.dataTransfer.files);
        }}
        className={`mt-4 rounded-[20px] border border-dashed p-4 transition-colors sm:p-5 ${
          dragging ? "border-ink bg-paper-deep" : message ? "border-accent" : "border-line"
        }`}
      >
        {photos.length > 0 ? (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Attached photos">
            {photos.map((photo, index) => (
              <li key={photo.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="aspect-square w-full rounded-[14px] object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            id="field-images"
            type="button"
            disabled={busy || full}
            onClick={() => pickerRef.current?.click()}
            aria-describedby={["field-images-hint", message ? "field-images-error" : null].filter(Boolean).join(" ")}
            aria-invalid={Boolean(message)}
            className="inline-flex items-center gap-2.5 rounded-full border border-line px-6 py-3 text-[0.8125rem] font-medium tracking-[0.02em] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 1v12M1 7h12" />
            </svg>
            {busy ? "Preparing photos…" : photos.length > 0 ? "Add more photos" : "Add photos"}
          </button>
          <p className="text-[0.85rem] text-stone" aria-live="polite">
            {full
              ? `${L.maxCount} of ${L.maxCount} photos attached.`
              : photos.length > 0
                ? `${photos.length} of ${L.maxCount} photos attached.`
                : "or drag them here. JPEG, PNG or WebP."}
          </p>
        </div>
      </div>

      {message ? (
        <p id="field-images-error" className="mt-2 text-[0.9rem] font-medium text-accent-deep">
          {message}
        </p>
      ) : null}
    </div>
  );
}
