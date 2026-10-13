import { brand } from "@/config/brand";
import { getSiteUrl } from "@/config/site";
import { absoluteUrl, paths } from "@/lib/urls";

type JsonLd = Record<string, unknown>;

/**
 * Serialise structured data for a <script type="application/ld+json"> tag.
 * Escaping "<" prevents a stray "</script>" in editorial text from breaking
 * out of the tag.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: getSiteUrl(),
    description: brand.description,
    sameAs: brand.social.map((link) => link.href),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: getSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${getSiteUrl()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export type StoryJsonLdInput = {
  slug: string;
  canonicalUrl: string;
  headline: string;
  description: string | null;
  imageUrl: string | null;
  publishedAt: string;
  modifiedAt: string;
  authorName: string;
  authorSlug: string | null;
  authorHasProfile: boolean;
  category: string | null;
  wordCount?: number;
};

export function articleJsonLd(input: StoryJsonLdInput): JsonLd {
  const author: JsonLd = {
    "@type": "Person",
    name: input.authorName,
  };
  if (input.authorSlug && input.authorHasProfile) {
    author.url = absoluteUrl(paths.contributor(input.authorSlug));
  }

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": input.canonicalUrl },
    headline: input.headline.slice(0, 110),
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt,
    author,
    publisher: { "@type": "Organization", name: brand.name, url: getSiteUrl() },
  };
  if (input.description) data.description = input.description;
  if (input.imageUrl) data.image = [input.imageUrl];
  if (input.category) data.articleSection = input.category;
  if (input.wordCount) data.wordCount = input.wordCount;
  return data;
}

export function personJsonLd(input: {
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  sameAs: string[];
  expertise: string[];
}): JsonLd {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: absoluteUrl(paths.contributor(input.slug)),
  };
  if (input.bio) data.description = input.bio.slice(0, 300);
  if (input.imageUrl) data.image = input.imageUrl;
  if (input.sameAs.length) data.sameAs = input.sameAs;
  if (input.expertise.length) data.knowsAbout = input.expertise;
  return data;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
