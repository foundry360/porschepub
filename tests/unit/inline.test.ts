import { describe, expect, it } from "vitest";
import { inlineToPlainText, isSafeHref, parseInline } from "@/lib/content/inline";

describe("isSafeHref", () => {
  it.each(["https://example.com/a?b=c", "http://example.com", "mailto:hi@example.com", "/stories/x"])("allows %s", (href) => {
    expect(isSafeHref(href)).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//evil.example",
    "https://exa mple.com",
    "https://example.com/\u0000",
    "",
    "   ",
    "ftp://example.com",
  ])("rejects %j", (href) => {
    expect(isSafeHref(href)).toBe(false);
  });
});

describe("parseInline", () => {
  it("parses bold, italic and links", () => {
    expect(parseInline("a **b** *c* [d](https://example.com) e")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "b" },
      { type: "text", text: " " },
      { type: "em", text: "c" },
      { type: "text", text: " " },
      { type: "link", text: "d", href: "https://example.com", external: true },
      { type: "text", text: " e" },
    ]);
  });
  it("marks site-relative links as internal", () => {
    expect(parseInline("[x](/about)")).toEqual([{ type: "link", text: "x", href: "/about", external: false }]);
  });
  it("keeps the text but drops an unsafe link", () => {
    const tokens = parseInline("[click](javascript:alert(1))");
    expect(tokens.some((t) => t.type === "link")).toBe(false);
    expect(tokens[0]).toEqual({ type: "text", text: "click" });
    expect(JSON.stringify(tokens)).not.toContain("javascript");
  });
  it("never emits HTML: markup in text stays literal text", () => {
    const tokens = parseInline("<img src=x onerror=alert(1)> **ok**");
    expect(tokens[0]).toEqual({ type: "text", text: "<img src=x onerror=alert(1)> " });
  });
  it("leaves unmatched markers alone", () => {
    expect(inlineToPlainText("2 * 3 = 6 and **unclosed")).toBe("2 * 3 = 6 and **unclosed");
  });
  it("does not treat arithmetic asterisks as emphasis", () => {
    expect(inlineToPlainText("2 * 3 * 4 = 24")).toBe("2 * 3 * 4 = 24");
  });
  it("converts to plain text", () => {
    expect(inlineToPlainText("**Bold** and [link](https://x.test)")).toBe("Bold and link");
  });
  it("handles pathological input quickly", () => {
    const start = Date.now();
    parseInline("*".repeat(50_000) + "[".repeat(50_000));
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
