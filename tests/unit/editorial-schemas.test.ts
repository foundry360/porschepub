import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  contributorInputSchema,
  flattenIssues,
  mediaMetadataSchema,
  storyInputSchema,
} from "@/lib/editorial/schemas";

const UUID = "0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10";
const base = {
  headline: "  A   headline ",
  slug: "",
  subtitle: "",
  summary: "",
  body: [{ type: "paragraph", text: "Hi" }],
  categoryId: "",
  contributorId: "",
  leadImageId: "",
  ogImageId: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrlOverride: "",
  publishedAt: "",
};

describe("storyInputSchema", () => {
  it("normalises empty strings to null and cleans text", () => {
    const parsed = storyInputSchema.parse(base);
    expect(parsed.headline).toBe("A headline");
    expect(parsed.subtitle).toBeNull();
    expect(parsed.categoryId).toBeNull();
    expect(parsed.publishedAt).toBeNull();
    expect(parsed.intent).toBe("save");
    expect(parsed.tags).toEqual([]);
  });
  it("requires a headline", () => {
    const result = storyInputSchema.safeParse({ ...base, headline: "   " });
    expect(result.success).toBe(false);
    if (!result.success) expect(flattenIssues(result.error).headline).toBeTruthy();
  });
  it("rejects invalid slugs but allows an empty one (auto-generated)", () => {
    expect(storyInputSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, slug: "good-slug" }).success).toBe(true);
  });
  it("only accepts https canonical overrides", () => {
    expect(storyInputSchema.safeParse({ ...base, canonicalUrlOverride: "http://x.test" }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, canonicalUrlOverride: "javascript:alert(1)" }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, canonicalUrlOverride: "https://x.test/a" }).success).toBe(true);
  });
  it("rejects malformed ids and unknown intents", () => {
    expect(storyInputSchema.safeParse({ ...base, categoryId: "nope" }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, intent: "delete-everything" }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, id: "1 OR 1=1" }).success).toBe(false);
  });
  it("normalises dates to ISO and rejects nonsense", () => {
    const ok = storyInputSchema.parse({ ...base, publishedAt: "2026-06-01T10:00:00.000Z" });
    expect(ok.publishedAt).toBe("2026-06-01T10:00:00.000Z");
    expect(storyInputSchema.safeParse({ ...base, publishedAt: "yesterday-ish" }).success).toBe(false);
  });
  it("limits related stories and tags", () => {
    const ids = Array.from({ length: 7 }, () => UUID);
    expect(storyInputSchema.safeParse({ ...base, relatedIds: ids }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...base, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success).toBe(false);
  });
  it("rejects bodies that don't match the block model", () => {
    expect(storyInputSchema.safeParse({ ...base, body: [{ type: "html", html: "<b>x</b>" }] }).success).toBe(false);
  });
});

describe("other editorial schemas", () => {
  const contributor = {
    name: "A",
    slug: "",
    descriptor: "",
    bio: "",
    avatarAssetId: "",
    websiteUrl: "",
    socialUrl: "",
    email: "",
    notes: "",
  };
  it("contributor: https-only links, private fields allowed", () => {
    const ok = contributorInputSchema.safeParse({ ...contributor, websiteUrl: "https://a.test", email: "a@b.test" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.profileVisible).toBe(false); // public profiles are opt-in
    expect(contributorInputSchema.safeParse({ ...contributor, websiteUrl: "javascript:x" }).success).toBe(false);
    expect(contributorInputSchema.safeParse({ ...contributor, websiteUrl: "http://insecure.test" }).success).toBe(false);
  });
  it("category: sort order is a bounded integer", () => {
    const category = { name: "X", slug: "", description: "" };
    expect(categoryInputSchema.safeParse({ ...category, sortOrder: "5" }).success).toBe(true);
    expect(categoryInputSchema.safeParse({ ...category, sortOrder: "99999" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ ...category, sortOrder: "1.5" }).success).toBe(false);
  });
  it("media metadata trims and nulls empty optional fields", () => {
    const parsed = mediaMetadataSchema.parse({ altText: " Alt ", caption: "", credit: " C ", licenseNote: "", sourceNote: "" });
    expect(parsed).toEqual({ altText: "Alt", caption: null, credit: "C", licenseNote: null, sourceNote: null });
  });
});
