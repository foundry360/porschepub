import { afterEach, describe, expect, it, vi } from "vitest";
import { newSubmissionEmail } from "@/server/email/templates";
import { logger } from "@/server/logger";

describe("notification email", () => {
  const notice = {
    id: "0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10",
    name: `<img src=x onerror=alert(1)>`,
    email: "a@example.test",
    title: `"><script>alert(1)</script>`,
    subject: "A 911 & more",
    categoryName: "Ownership",
    pitchExcerpt: "<b>pitch</b>",
  };

  it("escapes every submitter-controlled value in the HTML body", () => {
    const { html } = newSubmissionEmail(notice);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>pitch");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A 911 &amp; more");
  });

  it("links to the admin review page (which requires sign-in)", () => {
    const { text, html } = newSubmissionEmail(notice);
    expect(text).toContain("https://journal.example.test/admin/submissions/0b9c1e7e-5a4b-4c41-8b1a-2f6a3b1c9d10");
    expect(html).toContain("/admin/submissions/");
  });

  it("keeps the subject line bounded", () => {
    expect(newSubmissionEmail({ ...notice, title: "x".repeat(1000) }).subject.length).toBeLessThanOrEqual(200);
  });
});

describe("logger redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_IN_TESTS;
  });

  it("redacts personal and secret fields, including nested ones", () => {
    process.env.LOG_IN_TESTS = "1";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test.event", {
      email: "private@example.test",
      pitch: "private pitch text",
      password: "hunter2",
      nested: { token: "abc", ok: "visible" },
      submissionId: "id-123",
    });
    const line = String(spy.mock.calls[0][0]);
    expect(line).not.toContain("private@example.test");
    expect(line).not.toContain("private pitch text");
    expect(line).not.toContain("hunter2");
    expect(line).not.toContain('"abc"');
    expect(line).toContain("visible");
    expect(line).toContain("id-123");
  });

  it("does not serialise whole error objects (only name, message, code)", () => {
    process.env.LOG_IN_TESTS = "1";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("boom"), { details: "private-details", stack: "secret-stack" });
    logger.error("test.failure", {}, error);
    const line = String(spy.mock.calls[0][0]);
    expect(line).toContain("boom");
    expect(line).not.toContain("private-details");
    expect(line).not.toContain("secret-stack");
  });
});
