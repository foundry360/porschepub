import Link from "next/link";
import { brand } from "@/config/brand";

/** Text wordmark driven entirely by brand config. Replace with an SVG logo here. */
export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name}, home`}
      className={`font-display text-[1.35rem] leading-none tracking-[-0.01em] sm:text-[1.6rem] ${
        inverted ? "text-paper" : "text-ink"
      } ${className}`}
    >
      {brand.wordmark.text}
    </Link>
  );
}
