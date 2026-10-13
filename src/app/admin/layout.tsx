import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@/config/brand";

// Admin pages must never be indexed or cached by shared caches. This is
// reinforced by the `X-Robots-Tag` and `Cache-Control` headers in next.config.ts.
export const metadata: Metadata = {
  title: { default: `Editorial | ${brand.name}`, template: `%s | Editorial | ${brand.name}` },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const instant = false;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
