import Link from "next/link";
import type { ReactNode } from "react";

type PillVariant = "solid" | "outline" | "inverse";

const VARIANTS: Record<PillVariant, string> = {
  solid: "border-ink bg-ink text-paper hover:bg-transparent hover:text-ink",
  outline: "border-line text-ink hover:border-ink hover:bg-ink hover:text-paper",
  /** For always-dark sections, where the light tokens are pinned. */
  inverse: "border-paper bg-paper text-ink hover:bg-transparent hover:text-paper",
};

export function pillClass(variant: PillVariant = "solid", className = ""): string {
  return `inline-flex items-center gap-2.5 rounded-full border px-6 py-3.5 text-[0.8125rem] font-medium tracking-[0.02em] transition-colors duration-300 ${VARIANTS[variant]} ${className}`;
}

export function Pill({
  href,
  children,
  variant = "solid",
  className = "",
  arrow = true,
}: {
  href: string;
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
  arrow?: boolean;
}) {
  return (
    <Link href={href} className={pillClass(variant, className)}>
      {children}
      {arrow ? <span aria-hidden>→</span> : null}
    </Link>
  );
}
