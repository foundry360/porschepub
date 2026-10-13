"use client";

import { useState } from "react";

/**
 * Sharing controls. Network links are plain anchors (work without JavaScript and
 * set no third-party scripts). The copy/share button enhances with the Web Share
 * API where available.
 */
export function ShareControls({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function handleShare() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("failed");
    }
  }

  const linkClass = "eyebrow link-underline";
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Share this story" role="group">
      <span className="eyebrow text-stone">Share</span>
      <a
        className={linkClass}
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        X<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a
        className={linkClass}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a
        className={linkClass}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        LinkedIn<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a className={linkClass} href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}>
        Email
      </a>
      <button type="button" onClick={handleShare} className={linkClass}>
        {status === "copied" ? "Link copied" : "Copy link"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === "copied" ? "Link copied to clipboard" : status === "failed" ? "Could not copy link" : ""}
      </span>
    </div>
  );
}
