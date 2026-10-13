import Link from "next/link";
import { brand } from "@/config/brand";

/** Text wordmark driven entirely by brand config. Replace with an SVG logo here. */
export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name}, home`}
      className={`inline-flex items-center gap-2.5 text-[0.9375rem] min-[360px]:whitespace-nowrap font-semibold leading-none tracking-[-0.01em] ${
        inverted ? "text-paper" : "text-ink"
      } ${className}`}
    >
      <span aria-hidden className="block h-2.5 w-2.5 rounded-full bg-accent" />
      {brand.wordmark.text}
    </Link>
  );
}
