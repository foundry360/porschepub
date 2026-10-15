import Link from "next/link";
import { brand } from "@/config/brand";

/** Two aligned alpha masks cut from the same artwork: the lettering, and the ampersand alone. */
const LOGO = {
  letters: "/brand/werks-marque-logo-letters.png",
  ampersand: "/brand/werks-marque-logo-ampersand.png",
  width: 943,
  height: 94,
};

function maskStyle(src: string) {
  return {
    maskImage: `url(${src})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "left center",
  };
}

/**
 * The logotype, painted through alpha masks: the lettering in `currentColor`
 * (so it follows light, dark and always-dark sections) and the ampersand in
 * the accent. Size it with a width class; the height follows the artwork.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative block ${className}`} style={{ aspectRatio: `${LOGO.width} / ${LOGO.height}` }}>
      <span className="absolute inset-0 bg-current" style={maskStyle(LOGO.letters)} />
      <span className="absolute inset-0 bg-accent" style={maskStyle(LOGO.ampersand)} />
    </span>
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
