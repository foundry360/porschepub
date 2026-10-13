/**
 * Cache Components rejects an empty `generateStaticParams` result at build time,
 * which would break the very first deploy (a fresh database has no stories or
 * contributors yet). When there is nothing to prerender, return one placeholder
 * instead. It can never match real content (slugs are lowercase letters, digits
 * and single hyphens), so the page resolves it to its normal not-found result.
 */
export const PLACEHOLDER_SLUG = "__placeholder__";

export function slugParamsOrPlaceholder(slugs: readonly string[]): Array<{ slug: string }> {
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }];
}
