import { describe, expect, it } from "vitest";
import { findAvailableSlug, isReservedSlug, isValidSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, folds diacritics and collapses punctuation", () => {
    expect(slugify("Müller's 911 — Café Racer!")).toBe("mullers-911-cafe-racer");
  });
  it("turns ampersands into 'and'", () => {
    expect(slugify("Design & Engineering")).toBe("design-and-engineering");
  });
  it("never leaves leading or trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });
  it("returns an empty string for text with no usable characters", () => {
    expect(slugify("!!!")).toBe("");
  });
  it("truncates on a word boundary when possible", () => {
    const slug = slugify("the quick brown fox jumps over the lazy dog again and again", 30);
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("isValidSlug / isReservedSlug", () => {
  it("accepts well-formed slugs and rejects malformed ones", () => {
    expect(isValidSlug("a-good-slug-2")).toBe(true);
    for (const bad of ["", "Upper", "double--hyphen", "-lead", "trail-", "has space", "a/b", "../etc"]) {
      expect(isValidSlug(bad), bad).toBe(false);
    }
  });
  it("rejects slugs longer than the limit", () => {
    expect(isValidSlug("a".repeat(121))).toBe(false);
    expect(isValidSlug("a".repeat(120))).toBe(true);
  });
  it("reserves route-like words", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("new")).toBe(true);
    expect(isReservedSlug("my-story")).toBe(false);
  });
});

describe("findAvailableSlug", () => {
  it("returns the base when free", async () => {
    expect(await findAvailableSlug("story", async () => false)).toBe("story");
  });
  it("appends a counter until a free slug is found", async () => {
    const taken = new Set(["story", "story-2"]);
    expect(await findAvailableSlug("story", async (c) => taken.has(c))).toBe("story-3");
  });
  it("skips reserved words", async () => {
    expect(await findAvailableSlug("admin", async () => false)).toBe("admin-2");
  });
  it("gives up after too many attempts", async () => {
    await expect(findAvailableSlug("x", async () => true, 3)).rejects.toThrow();
  });
});
