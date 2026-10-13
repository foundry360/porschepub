/**
 * Analytics boundary.
 *
 * Provider: Plausible (cookieless, no personal data) when configured via
 * NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible and NEXT_PUBLIC_PLAUSIBLE_DOMAIN.
 * With no configuration nothing is loaded and `track()` is a no-op.
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

declare global {
  interface Window {
    plausible?: ((name: string, options?: { props?: Props }) => void) & { q?: unknown[] };
  }
}

export function analyticsConfig() {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim() || "none";
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim() || "";
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC?.trim() || "https://plausible.io/js/script.js";
  const requireConsent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true";
  return {
    enabled: provider === "plausible" && domain.length > 0,
    provider,
    domain,
    src,
    requireConsent,
  };
}

export const CONSENT_STORAGE_KEY = "analytics-consent";

export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(event, props ? { props } : undefined);
  } catch {
    // Analytics must never break the page.
  }
}
