/**
 * Analytics boundary.
 *
 * Providers:
 * - ga4: Google Analytics 4 via gtag when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
 * - plausible: Plausible when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set
 * - none: nothing loaded; `track()` is a no-op
 *
 * To switch provider, change the loader in components/analytics/analytics.tsx
 * and the sink inside `track()`; call sites stay the same.
 */

export type AnalyticsEvent =
  | "Story Read Progress"
  | "Search"
  | "Category Navigation"
  | "Contributor View"
  | "Submission Started"
  | "Submission Succeeded"
  | "Submission Failed";

type Props = Record<string, string | number | boolean>;

type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
    plausible?: ((name: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export type AnalyticsProvider = "ga4" | "plausible" | "none";

export function analyticsConfig() {
  const provider = (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim() || "none") as AnalyticsProvider;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim() || "";
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC?.trim() || "https://plausible.io/js/script.js";
  const requireConsent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true";

  const enabled =
    (provider === "ga4" && /^G-[A-Z0-9]+$/i.test(measurementId)) ||
    (provider === "plausible" && domain.length > 0);

  return {
    enabled,
    provider,
    measurementId,
    domain,
    src,
    requireConsent,
  };
}

export const CONSENT_STORAGE_KEY = "analytics-consent";

function toGaEventName(event: AnalyticsEvent): string {
  return event.toLowerCase().replace(/\s+/g, "_");
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) return;
  try {
    window.gtag("config", measurementId, { page_path: path });
  } catch {
    // Analytics must never break the page.
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", toGaEventName(event), props);
      return;
    }
    if (typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Analytics must never break the page.
  }
}
