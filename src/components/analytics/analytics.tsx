"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { analyticsConfig, CONSENT_STORAGE_KEY, trackPageView } from "@/lib/analytics";

type Consent = "granted" | "denied" | null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage unavailable: choice applies for this page view only.
  }
  listeners.forEach((listener) => listener());
}

function GaPageViews({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useRef(true);

  useEffect(() => {
    // gtag('config') already records the first page view on load.
    if (initial.current) {
      initial.current = false;
      return;
    }
    const query = searchParams?.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams, measurementId]);

  return null;
}

/**
 * Loads the configured analytics provider. Renders nothing when analytics is not
 * configured. When NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true the script is only
 * loaded after the visitor accepts. The admin area is never measured.
 */
export function Analytics() {
  const config = analyticsConfig();
  const pathname = usePathname();
  const consent = useSyncExternalStore<Consent>(subscribe, readConsent, () => null);

  if (!config.enabled) return null;
  if (pathname?.startsWith("/admin")) return null;

  const allowed = !config.requireConsent || consent === "granted";

  return (
    <>
      {allowed && config.provider === "ga4" ? (
        <>
          <Script
            id="ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${config.measurementId}', { anonymize_ip: true });
            `}
          </Script>
          <Suspense fallback={null}>
            <GaPageViews measurementId={config.measurementId} />
          </Suspense>
        </>
      ) : null}
      {allowed && config.provider === "plausible" ? (
        <>
          {/* Queue stub so events fired before the script loads are not lost. */}
          <Script id="plausible-init" strategy="afterInteractive">
            {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
          </Script>
          <Script
            id="plausible-script"
            strategy="afterInteractive"
            src={config.src}
            data-domain={config.domain}
          />
        </>
      ) : null}
      {config.requireConsent && consent === null ? (
        <div
          role="region"
          aria-label="Analytics consent"
          className="fixed inset-x-0 bottom-0 z-50 bg-brand px-5 py-4 text-on-brand"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-brand/90">
              We use analytics to understand which stories people read. Is that okay?
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => writeConsent("denied")}
                className="border border-on-brand/70 px-4 py-2 text-sm text-on-brand transition-colors hover:border-paper hover:bg-paper hover:text-ink"
              >
                No thanks
              </button>
              <button
                type="button"
                onClick={() => writeConsent("granted")}
                className="bg-paper px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
