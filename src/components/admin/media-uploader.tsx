"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "./media-picker";
import { buttonClass, Notice } from "./ui";

/** Upload panel for the media library page (collapsed until needed). */
export function MediaUploader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="mb-8">
      {done ? <div className="mb-4"><Notice tone="success">Image uploaded.</Notice></div> : null}
      {open ? (
        <div className="border border-line bg-surface p-5">
          <Upload
            key={String(done)}
            onUploaded={() => {
              setDone(true);
              setOpen(false);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <button type="button" onClick={() => { setDone(false); setOpen(true); }} className={buttonClass}>
          Upload image
        </button>
      )}
    </div>
  );
}
