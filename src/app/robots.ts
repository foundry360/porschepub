import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

/**
 * Indexing is OFF unless ALLOW_INDEXING=true is set explicitly (production
 * only). Preview and staging deployments therefore can never be crawled by
 * accident. Admin, API and search-result URLs are always disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.ALLOW_INDEXING === "true";

  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/search"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  };
}
