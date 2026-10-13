"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server errors are logged on the server; this keeps a digest for correlation.
    console.error("Route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-28 text-center sm:py-40">
      <p className="eyebrow text-accent">Something went wrong</p>
      <h1 className="font-display mt-5 text-[2.6rem] leading-[1.05] sm:text-[3.6rem]">
        We couldn&rsquo;t load this page
      </h1>
      <p className="mx-auto mt-6 max-w-lg text-stone">
        This is on us, not you. Please try again, or head back to the homepage.
        {error.digest ? <span className="mt-2 block text-[0.8rem]">Reference: {error.digest}</span> : null}
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        <button type="button" onClick={reset} className="bg-ink px-7 py-4 text-sm tracking-wide text-paper hover:bg-charcoal">
          Try again
        </button>
        <Link href="/" className="eyebrow link-underline">
          Homepage
        </Link>
      </div>
    </div>
  );
}
