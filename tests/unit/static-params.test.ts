import { describe, expect, it } from "vitest";
import { isValidSlug } from "@/lib/slug";
import { PLACEHOLDER_SLUG, slugParamsOrPlaceholder } from "@/lib/static-params";

describe("slugParamsOrPlaceholder", () => {
  it("maps real slugs", () => {
    expect(slugParamsOrPlaceholder(["a", "b-c"])).toEqual([{ slug: "a" }, { slug: "b-c" }]);
  });

  it("returns a single placeholder for an empty database", () => {
    expect(slugParamsOrPlaceholder([])).toEqual([{ slug: PLACEHOLDER_SLUG }]);
  });

  it("uses a placeholder that can never be a real slug", () => {
    expect(isValidSlug(PLACEHOLDER_SLUG)).toBe(false);
  });
});
