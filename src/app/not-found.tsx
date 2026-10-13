import type { Metadata } from "next";
import { Suspense } from "react";
import { NotFoundView } from "@/components/site/not-found-view";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** Fallback for URLs that match no route at all (outside the site layout). */
export default function RootNotFound() {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-line" />}>
        <SiteHeader />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        <NotFoundView />
      </main>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </>
  );
}
