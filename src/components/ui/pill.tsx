import Link from "next/link";
import type { ReactNode } from "react";

type PillVariant = "solid" | "outline" | "inverse";

const VARIANTS: Record<PillVariant, string> = {
  solid: "border-ink bg-ink text-paper hover:border-brand hover:bg-brand hover:text-on-brand",
  outline: "border-line text-ink hover:border-brand hover:bg-brand hover:text-on-brand",
  /** For always-dark sections: clear at rest, gold on hover. */
  inverse: "border-paper bg-transparent text-paper hover:border-accent hover:bg-accent hover:text-ink",
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
