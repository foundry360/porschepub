/**
 * Central brand configuration.
 *
 * The publication is named "Werks & Marque". Everything that depends on
 * the publication's identity (name, wordmark, tagline, colours, social links,
 * contact details, disclaimers) is read from here so a rename never requires
 * edits across the codebase.
 *
 * Override at deploy time with NEXT_PUBLIC_BRAND_* environment variables, or
 * edit the defaults below. Colour tokens live in `src/app/globals.css`
 * (`--color-accent`); `accentColor` here is used only where a literal value is
 * required (theme-color meta, social image generation).
 *
 * TRADEMARK NOTE: review the final name, domain and visual identity for
 * trademark and affiliation risk before launch. This publication is not
 * affiliated with Porsche AG.
 */

function env(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const name = env(process.env.NEXT_PUBLIC_BRAND_NAME, "Werks & Marque");

export type SocialLink = { label: string; href: string };

const socialCandidates: Array<[string, string | undefined]> = [
  ["Instagram", process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL],
  ["YouTube", process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL],
  ["Facebook", process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL],
  ["X", process.env.NEXT_PUBLIC_SOCIAL_X_URL],
];

export const brand = {
  name,
  /** Used in tight spaces such as the admin sidebar and email subjects. */
  shortName: env(process.env.NEXT_PUBLIC_BRAND_SHORT_NAME, name),
  tagline: env(
    process.env.NEXT_PUBLIC_BRAND_TAGLINE,
    "First-person stories from the people behind Porsche",
  ),
  description: env(
    process.env.NEXT_PUBLIC_BRAND_DESCRIPTION,
    "An independent publication of first-person stories about the owners, drivers, designers, restorers and enthusiasts who give Porsche its meaning.",
  ),
  /** Two-line wordmark rendering. If `name` is changed, the wordmark follows. */
  wordmark: {
    text: name,
  },
  locale: "en_US",
  /** Public editorial contact shown in the footer and privacy page. */
  contactEmail: optionalEnv(process.env.NEXT_PUBLIC_EDITORIAL_CONTACT_EMAIL),
  social: socialCandidates
    .filter((entry): entry is [string, string] => Boolean(optionalEnv(entry[1])))
    .map(([label, href]): SocialLink => ({ label, href: href.trim() })),
  /** Literal accent for places that cannot use CSS variables. */
  accentColor: "#c31d14",
  themeColor: "#ffffff",
  /** Browser chrome colour in dark mode; matches the dark `--color-paper`. */
  themeColorDark: "#0b0b0b",
  /** Shown in the footer and on the About page. */
  disclaimer:
    "Independent publication. Not affiliated with, authorised or endorsed by Porsche AG. Porsche and related names are trademarks of their respective owners.",
  /** Fallback homepage hero copy used until editors set `home.hero` in settings. */
  heroDefaults: {
    kicker: "Stories & photography",
    headline: "The people behind the cars",
    intro:
      "Owners, racers, restorers and designers tell the stories that never fit in a spec sheet.",
  },
  /** Copyright holder shown in the footer. */
  publisher: env(process.env.NEXT_PUBLIC_PUBLISHER_NAME, name),
} as const;

export type Brand = typeof brand;
