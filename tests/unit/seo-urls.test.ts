import { describe, expect, it } from "vitest";
import { articleJsonLd, breadcrumbJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, parsePageParam, paths, storyCanonicalUrl } from "@/lib/urls";

describe("urls", () => {
  it("builds canonical story URLs on the configured site", () => {
    expect(storyCanonicalUrl({ slug: "a-story" })).toBe("https://journal.example.test/stories/a-story");
  });
  it("honours a canonical override", () => {
    expect(storyCanonicalUrl({ slug: "x", canonical_url_override: "https://elsewhere.test/x" })).toBe("https://elsewhere.test/x");
  });
  it("leaves absolute URLs alone and prefixes relative ones", () => {
    expect(absoluteUrl("https://a.test/x")).toBe("https://a.test/x");
    expect(absoluteUrl("/x")).toBe("https://journal.example.test/x");
    expect(absoluteUrl("x")).toBe("https://journal.example.test/x");
  });
  it("omits page=1 from paginated paths", () => {
    expect(paths.stories(1)).toBe("/stories");
    expect(paths.stories(3)).toBe("/stories?page=3");
    expect(paths.search("911 turbo", 2)).toBe("/search?q=911+turbo&page=2");
  });
  it("parses page params defensively", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-4")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam(["3", "9"])).toBe(3);
    expect(parsePageParam("99999999", 100)).toBe(100);
  });
});

describe("JSON-LD", () => {
  it("cannot be broken out of its script tag", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });
  it("builds an Article with required properties", () => {
    const ld = articleJsonLd({
      slug: "s",
      canonicalUrl: "https://journal.example.test/stories/s",
      headline: "H".repeat(200),
      description: "d",
      imageUrl: "https://img.test/a.jpg",
      publishedAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-02T00:00:00Z",
      authorName: "Author",
      authorSlug: "author",
      authorHasProfile: false,
      category: "Cat",
      wordCount: 10,
    });
    expect(ld["@type"]).toBe("Article");
    expect((ld.headline as string).length).toBeLessThanOrEqual(110);
    // No profile page => no link to a page that would 404.
    expect((ld.author as Record<string, unknown>).url).toBeUndefined();
  });
  it("builds ordered breadcrumbs with absolute URLs", () => {
    const ld = breadcrumbJsonLd([{ name: "Stories", path: "/stories" }, { name: "X", path: "/stories/x" }]) as {
      itemListElement: Array<{ position: number; item: string }>;
    };
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(ld.itemListElement[1].item).toBe("https://journal.example.test/stories/x");
  });
});
