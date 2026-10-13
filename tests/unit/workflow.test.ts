import { describe, expect, it } from "vitest";
import {
  allowedSubmissionTransitions,
  blockingIssues,
  canTransitionSubmission,
  storyLifecycle,
  storyReadiness,
  submissionTransitionRequiresNote,
  SUBMISSION_STATUSES,
  type StoryReadinessInput,
} from "@/lib/workflow";

const READY: StoryReadinessInput = {
  slug: "a-story",
  headline: "A story",
  summary: "Summary",
  bodyBlockCount: 3,
  contributorId: "c",
  categoryId: "k",
  leadImageId: "i",
  leadImageAlt: "Alt text",
  seoDescription: "Description",
};

describe("submission workflow", () => {
  it("never allows leaving 'published'", () => {
    expect(allowedSubmissionTransitions("published")).toEqual([]);
  });
  it("never allows going straight from submitted to accepted or published", () => {
    expect(canTransitionSubmission("submitted", "accepted")).toBe(false);
    expect(canTransitionSubmission("submitted", "published")).toBe(false);
  });
  it("requires review before acceptance and acceptance before publication", () => {
    expect(canTransitionSubmission("submitted", "in_review")).toBe(true);
    expect(canTransitionSubmission("in_review", "accepted")).toBe(true);
    expect(canTransitionSubmission("accepted", "published")).toBe(true);
    expect(canTransitionSubmission("in_review", "published")).toBe(false);
  });
  it("lets a declined submission be reopened for review only", () => {
    expect(allowedSubmissionTransitions("declined")).toEqual(["in_review"]);
  });
  it("requires a note only when declining", () => {
    for (const status of SUBMISSION_STATUSES) {
      expect(submissionTransitionRequiresNote(status)).toBe(status === "declined");
    }
  });
  it("has no transition back to the same state", () => {
    for (const status of SUBMISSION_STATUSES) expect(canTransitionSubmission(status, status)).toBe(false);
  });
});

describe("storyReadiness", () => {
  it("is clean when everything is present", () => {
    expect(storyReadiness(READY)).toEqual([]);
  });
  it.each([
    ["headline", { headline: "  " }],
    ["slug", { slug: "" }],
    ["body", { bodyBlockCount: 0 }],
    ["contributorId", { contributorId: null }],
    ["categoryId", { categoryId: null }],
    ["leadImageId", { leadImageId: null, leadImageAlt: null }],
  ])("blocks publishing without %s", (field, patch) => {
    const issues = blockingIssues(storyReadiness({ ...READY, ...patch }));
    expect(issues.map((i) => i.field)).toContain(field);
  });
  it("blocks a lead image with no alt text", () => {
    const issues = blockingIssues(storyReadiness({ ...READY, leadImageAlt: "  " }));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/alternative text/i);
  });
  it("treats summary and meta description as advice, not blockers", () => {
    const issues = storyReadiness({ ...READY, summary: null, seoDescription: null });
    expect(issues).toHaveLength(2);
    expect(blockingIssues(issues)).toHaveLength(0);
  });
});

describe("storyLifecycle", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  it("derives draft, scheduled, live and archived", () => {
    expect(storyLifecycle("draft", null, now)).toBe("draft");
    expect(storyLifecycle("draft", "2026-01-01T00:00:00Z", now)).toBe("draft");
    expect(storyLifecycle("published", "2026-07-01T00:00:00Z", now)).toBe("scheduled");
    expect(storyLifecycle("published", "2026-05-01T00:00:00Z", now)).toBe("live");
    expect(storyLifecycle("archived", "2026-05-01T00:00:00Z", now)).toBe("archived");
  });
  it("treats published-without-date as live (the database requires a date, so this is defensive)", () => {
    expect(storyLifecycle("published", null, now)).toBe("live");
  });
});
