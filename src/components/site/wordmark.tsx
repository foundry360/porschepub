import Link from "next/link";
import { brand } from "@/config/brand";

const LOGO = { src: "/brand/werks-marque-logo.png", width: 943, height: 94 };

/**
 * The logotype, painted in `currentColor` through an alpha mask so it follows
 * the surrounding text colour in light, dark and always-dark sections.
 * Size it with a width class; the height follows the artwork's ratio.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block bg-current ${className}`}
      style={{
        aspectRatio: `${LOGO.width} / ${LOGO.height}`,
        maskImage: `url(${LOGO.src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "left center",
      }}
    />
  );
}

export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name}, home`}
      className={`inline-flex items-center ${inverted ? "text-paper" : "text-ink"} ${className}`}
    >
      <BrandLogo className="w-[12rem] sm:w-[15rem]" />
    </Link>
  );
}
