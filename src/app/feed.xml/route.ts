import { brand } from "@/config/brand";
import { getSiteUrl } from "@/config/site";
import { absoluteUrl, paths } from "@/lib/urls";
import { escapeHtml } from "@/lib/validation/text";
import { listStories } from "@/server/content/public";

/** RSS 2.0 feed of live stories only (served from the same public, RLS-limited queries). */
export async function GET() {
  const { items } = await listStories({ page: 1, pageSize: 30 });
  const site = getSiteUrl();

  const entries = items
    .map((story) => {
      const link = absoluteUrl(paths.story(story.slug));
      return `<item>
<title>${escapeHtml(story.headline)}</title>
<link>${escapeHtml(link)}</link>
<guid isPermaLink="true">${escapeHtml(link)}</guid>
<pubDate>${new Date(story.publishedAt).toUTCString()}</pubDate>
${story.contributor ? `<dc:creator>${escapeHtml(story.contributor.name)}</dc:creator>` : ""}
${story.category ? `<category>${escapeHtml(story.category.name)}</category>` : ""}
<description>${escapeHtml(story.summary ?? story.subtitle ?? "")}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeHtml(brand.name)}</title>
<link>${escapeHtml(site)}</link>
<description>${escapeHtml(brand.description)}</description>
<language>en</language>
<atom:link href="${escapeHtml(site)}/feed.xml" rel="self" type="application/rss+xml" />
${entries}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
