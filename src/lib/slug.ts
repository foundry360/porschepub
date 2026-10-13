const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs reserved because they collide with routes or are ambiguous. */
const RESERVED_SLUGS = new Set([
  "new",
  "edit",
  "admin",
  "api",
  "feed",
  "rss",
  "sitemap",
  "search",
  "page",
]);

export function isValidSlug(value: string, maxLength = 120): boolean {
  return value.length > 0 && value.length <= maxLength && SLUG_PATTERN.test(value);
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.has(value);
}

/**
 * Turn arbitrary text into a URL-safe, human-readable slug.
 * Diacritics are folded ("Müller" -> "muller"), ampersands become "and", and
 * everything else outside [a-z0-9] collapses into single hyphens.
 */
export function slugify(input: string, maxLength = 80): string {
  const folded = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (folded.length <= maxLength) return folded;

  // Trim on a word boundary when possible.
  const cut = folded.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > maxLength * 0.5 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, "");
}

/** `slug`, `slug-2`, `slug-3`... until `isTaken` says the candidate is free. */
export async function findAvailableSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const root = base || "untitled";
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    if (!isReservedSlug(candidate) && !(await isTaken(candidate))) return candidate;
  }
  throw new Error("Could not find an available slug");
}
