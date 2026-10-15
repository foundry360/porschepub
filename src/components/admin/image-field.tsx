"use client";

/* eslint-disable @next/next/no-img-element -- admin thumbnail */
import { useState } from "react";
import { MediaPicker, type PickedImage } from "./media-picker";
import { buttonSecondaryClass } from "./ui";

export type ImageInfo = { id: string; url: string; alt: string };

/** Single-image chooser used for lead image, social image and avatars. */
export function ImageField({
  label,
  value,
  onChange,
  warnMissingAlt = false,
}: {
  label: string;
  value: ImageInfo | null;
  onChange: (image: ImageInfo | null) => void;
  warnMissingAlt?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-charcoal">{label}</p>
      {value ? (
        <div className="flex items-start gap-4">
          <img src={value.url} alt={value.alt || ""} className="h-24 w-32 border border-line object-cover" />
          <div className="min-w-0 space-y-2 text-[0.85rem]">
            <p className="text-stone">{value.alt ? value.alt : <span className="font-medium text-danger">No alt text{warnMissingAlt ? " (required to publish)" : ""}</span>}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(true)} className={buttonSecondaryClass}>
                Change
              </button>
              <button type="button" onClick={() => onChange(null)} className={buttonSecondaryClass}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={buttonSecondaryClass}>
          Choose image
        </button>
      )}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(image: PickedImage) => {
          onChange(image);
          setOpen(false);
        }}
      />
    </div>
  );
}
