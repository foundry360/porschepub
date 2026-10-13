import { describe, expect, it } from "vitest";
import { cleanText, countLinks, escapeHtml, normalizeEmail, normalizePublicUrl } from "@/lib/validation/text";
import {
  detectBotSignals,
  rawSubmissionFromFormData,
  rawSubmissionSchema,
  validateSubmission,
  type RawSubmission,
} from "@/lib/validation/submission";

const CATEGORY = "0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10";

function raw(overrides: Partial<RawSubmission> = {}): RawSubmission {
  return rawSubmissionSchema.parse({
    name: "Sam Example",
    email: "Sam@Example.com",
    title: "A working title",
    subject: "A 1987 911",
    categoryId: CATEGORY,
    pitch: "This is a pitch that is comfortably longer than eighty characters so it passes the minimum length check.",
    consent: "on",
    ...overrides,
  });
}

describe("cleanText", () => {
  it("removes control and bidi-override characters", () => {
    expect(cleanText("a\u0000b\u202ec\u200bd")).toBe("abcd");
  });
  it("collapses whitespace on single-line text and preserves paragraphs in multiline", () => {
    expect(cleanText("a   \n  b")).toBe("a b");
    expect(cleanText("a  \r\n\r\n\r\n\r\n\r\nb", { multiline: true })).toBe("a\n\n\nb");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims valid addresses", () => {
    expect(normalizeEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });
  it.each(["", "plain", "a@b", "a@@b.com", "a..b@example.com", ".a@example.com", "a b@example.com", "a@-example.com"])("rejects %j", (value) => {
    expect(normalizeEmail(value)).toBeNull();
  });
});

describe("normalizePublicUrl", () => {
  it("adds https and strips fragments", () => {
    expect(normalizePublicUrl("example.com/work#top")).toBe("https://example.com/work");
  });
  it.each([
    "javascript:alert(1)",
    "ftp://example.com",
    "https://user:pass@example.com",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://[::1]/",
    "https://intranet",
    "file:///etc/passwd",
  ])("rejects %j", (value) => {
    expect(normalizePublicUrl(value)).toBeNull();
  });
});

describe("misc text helpers", () => {
  it("counts links", () => {
    expect(countLinks("see https://a.test and www.b.test and plain text")).toBe(2);
  });
  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });
});

describe("validateSubmission", () => {
  it("accepts a good submission and normalises it", () => {
    const result = validateSubmission(raw());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("sam@example.com");
      expect(result.data.portfolioUrl).toBeNull();
      expect(result.data.additionalInfo).toBeNull();
    }
  });
  it("requires consent", () => {
    const result = validateSubmission(raw({ consent: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.consent).toBeTruthy();
  });
  it("reports every failing field at once", () => {
    const result = validateSubmission(rawSubmissionSchema.parse({}));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["categoryId", "consent", "email", "name", "pitch", "subject", "title"]);
    }
  });
  it("enforces the pitch length range", () => {
    expect(validateSubmission(raw({ pitch: "too short" })).ok).toBe(false);
    expect(validateSubmission(raw({ pitch: "x".repeat(5001) })).ok).toBe(false);
  });
  it("rejects link-stuffed pitches", () => {
    const spam = raw({ pitch: `${"Real words here. ".repeat(10)} https://a.test https://b.test https://c.test https://d.test` });
    const result = validateSubmission(spam);
    expect(result.ok).toBe(false);
  });
  it("rejects a non-uuid category", () => {
    const result = validateSubmission(raw({ categoryId: "'; drop table submissions;--" }));
    expect(result.ok).toBe(false);
  });
  it("rejects unsafe portfolio URLs", () => {
    expect(validateSubmission(raw({ portfolioUrl: "javascript:alert(1)" })).ok).toBe(false);
  });
});

describe("rawSubmissionFromFormData", () => {
  it("ignores unknown fields and non-string values", () => {
    const form = new FormData();
    form.set("name", "A");
    form.set("isAdmin", "true");
    form.set("pitch", new Blob(["file"]), "evil.txt");
    const parsed = rawSubmissionFromFormData(form);
    expect(parsed.name).toBe("A");
    expect(parsed.pitch).toBe("");
    expect("isAdmin" in parsed).toBe(false);
  });
});

describe("detectBotSignals", () => {
  it("flags a filled honeypot", () => {
    expect(detectBotSignals(raw({ website: "http://spam.test" }), 4)).toBe("honeypot");
  });
  it("flags implausibly fast submissions", () => {
    expect(detectBotSignals(raw({ elapsedMs: "800" }), 4)).toBe("too-fast");
  });
  it("does not treat missing timing (no JavaScript) as a bot", () => {
    expect(detectBotSignals(raw({ elapsedMs: "" }), 4)).toBeNull();
  });
  it("passes a plausible human", () => {
    expect(detectBotSignals(raw({ elapsedMs: "45000" }), 4)).toBeNull();
  });
});
