/**
 * Site-level configuration: canonical origin, navigation, pagination sizes and
 * submission policy constants. Brand identity lives in `brand.ts`.
 */

const DEFAULT_SITE_URL = "http://localhost:3000";

/** Canonical origin without a trailing slash. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw && raw.length > 0 ? raw : DEFAULT_SITE_URL;
  return url.replace(/\/+$/, "");
}

export const navigation = {
  primary: [
    { label: "Stories", href: "/stories" },
    { label: "Contributors", href: "/contributors" },
    { label: "About", href: "/about" },
    { label: "Tell Your Story", href: "/tell-your-story" },
  ],
  footer: [
    { label: "Stories", href: "/stories" },
    { label: "Contributors", href: "/contributors" },
    { label: "About", href: "/about" },
    { label: "Tell Your Story", href: "/tell-your-story" },
    { label: "Search", href: "/search" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Submission Terms", href: "/submission-terms" },
  ],
} as const;

export const pagination = {
  storiesPerPage: 12,
  searchPerPage: 10,
  contributorsPerPage: 24,
} as const;

export const homepage = {
  editorsPicksCount: 3,
  latestCount: 6,
  contributorHighlights: 4,
} as const;

/** Bump when the submission terms change materially. Stored with each consent. */
export const SUBMISSION_TERMS_VERSION = "2026-10-draft-1";

export const submissionPolicy = {
  /** Max accepted submissions per hashed IP per window. */
  perIpLimit: 3,
  perIpWindowSeconds: 60 * 60,
  /** Max accepted submissions per email address per window. */
  perEmailLimit: 3,
  perEmailWindowSeconds: 24 * 60 * 60,
  /** Anything faster than this after the form was rendered is treated as a bot. */
  minFillSeconds: 4,
  /** Rendered-form tokens expire after this many seconds. */
  maxTokenAgeSeconds: 6 * 60 * 60,
} as const;
