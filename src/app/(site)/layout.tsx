import { Suspense } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Wordmark } from "@/components/site/wordmark";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense
        fallback={
          <header className="on-black sticky top-0 z-30 border-b border-line bg-black">
            <div className="mx-auto flex h-16 max-w-[88rem] items-center px-5 sm:h-20 sm:px-8">
              <Wordmark />
            </div>
          </header>
        }
      >
        <SiteHeader />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Suspense fallback={<div className="mt-24 h-72 bg-ink" />}>
        <SiteFooter />
      </Suspense>
    </>
  );
}
