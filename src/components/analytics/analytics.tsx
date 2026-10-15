"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { analyticsConfig, CONSENT_STORAGE_KEY } from "@/lib/analytics";

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
      {allowed ? (
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
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper px-5 py-4 shadow-[0_-8px_30px_rgb(0_0_0/0.06)]"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-charcoal">
              We use privacy-focused analytics to understand which stories people read. It sets no
              cookies and collects no personal information. Is that okay?
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => writeConsent("denied")}
                className="border border-ink px-4 py-2 text-sm hover:border-brand hover:bg-brand hover:text-on-brand"
              >
                No thanks
              </button>
              <button
                type="button"
                onClick={() => writeConsent("granted")}
                className="bg-ink px-4 py-2 text-sm text-paper hover:bg-brand hover:text-on-brand"
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
