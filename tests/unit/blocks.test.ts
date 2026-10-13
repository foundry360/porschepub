import { describe, expect, it } from "vitest";
import {
  blocksToPlainText,
  bodySchema,
  collectImageAssetIds,
  countWords,
  embedUrl,
  estimateReadingMinutes,
  parseBodyForRender,
  parseBodyStrict,
  parseEmbedInput,
} from "@/lib/content/blocks";

const ASSET = "6f1c2c0a-3c1f-4b8e-9d55-0a1b2c3d4e5f";

describe("body schema", () => {
  it("accepts every supported block type", () => {
    const body = [
      { type: "paragraph", text: "Hello" },
      { type: "heading", level: 2, text: "Heading" },
      { type: "quote", text: "Said", attribution: "Someone" },
      { type: "pullquote", text: "Pull" },
      { type: "image", assetId: ASSET },
      { type: "list", items: ["a", "b"] },
      { type: "divider" },
      { type: "embed", provider: "youtube", videoId: "dQw4w9WgXcQ", title: "A video" },
    ];
    const parsed = parseBodyStrict(body);
    expect(parsed).toHaveLength(8);
    // defaults are applied
    expect(parsed[4]).toMatchObject({ layout: "inline" });
    expect(parsed[5]).toMatchObject({ ordered: false });
  });

  it("rejects raw HTML or script-ish block types", () => {
    expect(() => parseBodyStrict([{ type: "html", html: "<script>alert(1)</script>" }])).toThrow();
    expect(() => parseBodyStrict([{ type: "script", text: "x" }])).toThrow();
  });

  it("rejects embeds that are not identifiers", () => {
    const base = { type: "embed", provider: "youtube", title: "t" };
    expect(bodySchema.safeParse([{ ...base, videoId: "https://evil.example/x" }]).success).toBe(false);
    expect(bodySchema.safeParse([{ ...base, videoId: '"><script>' }]).success).toBe(false);
    expect(bodySchema.safeParse([{ ...base, provider: "evil", videoId: "abcd1234" }]).success).toBe(false);
  });

  it("rejects empty text and non-uuid asset ids", () => {
    expect(bodySchema.safeParse([{ type: "paragraph", text: "   " }]).success).toBe(false);
    expect(bodySchema.safeParse([{ type: "image", assetId: "not-a-uuid" }]).success).toBe(false);
  });

  it("caps the number of blocks", () => {
    const many = Array.from({ length: 501 }, () => ({ type: "divider" }));
    expect(bodySchema.safeParse(many).success).toBe(false);
  });
});

describe("parseBodyForRender", () => {
  it("skips invalid blocks instead of throwing, and reports how many", () => {
    const { blocks, skipped } = parseBodyForRender([
      { type: "paragraph", text: "ok" },
      { type: "mystery" },
      "nonsense",
    ]);
    expect(blocks).toHaveLength(1);
    expect(skipped).toBe(2);
  });
  it("tolerates a non-array body", () => {
    expect(parseBodyForRender(null)).toEqual({ blocks: [], skipped: 0 });
    expect(parseBodyForRender({})).toEqual({ blocks: [], skipped: 0 });
  });
});

describe("embeds", () => {
  it("extracts ids from common URL shapes", () => {
    expect(parseEmbedInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseEmbedInput("https://youtu.be/dQw4w9WgXcQ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
    expect(parseEmbedInput("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", videoId: "76979871" });
  });
  it("rejects other hosts and malformed input", () => {
    expect(parseEmbedInput("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbedInput("javascript:alert(1)")).toBeNull();
    expect(parseEmbedInput("not a url")).toBeNull();
  });
  it("builds privacy-enhanced embed URLs from ids only", () => {
    expect(embedUrl({ type: "embed", provider: "youtube", videoId: "dQw4w9WgXcQ", title: "t" })).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(embedUrl({ type: "embed", provider: "vimeo", videoId: "76979871", title: "t" })).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
  });
});

describe("text utilities", () => {
  it("extracts searchable plain text without markup", () => {
    const text = blocksToPlainText([
      { type: "paragraph", text: "A **bold** claim" },
      { type: "quote", text: "Quoted", attribution: "Person" },
      { type: "list", ordered: false, items: ["one", "two"] },
      { type: "divider" },
    ]);
    expect(text).toContain("A bold claim");
    expect(text).toContain("Person");
    expect(text).toContain("two");
    expect(text).not.toContain("**");
  });
  it("counts words including accents and apostrophes", () => {
    expect(countWords("Café owner's 911, über-rare")).toBe(4);
  });
  it("estimates reading time with a one minute floor", () => {
    expect(estimateReadingMinutes("short")).toBe(1);
    expect(estimateReadingMinutes("word ".repeat(2200))).toBe(10);
  });
  it("collects unique image asset ids", () => {
    const ids = collectImageAssetIds([
      { type: "image", assetId: ASSET, layout: "inline" },
      { type: "image", assetId: ASSET, layout: "wide" },
    ]);
    expect(ids).toEqual([ASSET]);
  });
});
