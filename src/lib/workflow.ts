/**
 * Editorial workflow rules that are pure functions of data, shared by server
 * actions, the admin UI and tests.
 */

export const SUBMISSION_STATUSES = [
  "submitted",
  "in_review",
  "accepted",
  "declined",
  "published",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const TRANSITIONS: Record<SubmissionStatus, readonly SubmissionStatus[]> = {
  submitted: ["in_review", "declined"],
  in_review: ["accepted", "declined", "submitted"],
  accepted: ["published", "declined", "in_review"],
  declined: ["in_review"],
  // Published is terminal: unpublishing a story does not rewrite history.
  published: [],
};

export function allowedSubmissionTransitions(from: SubmissionStatus): readonly SubmissionStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionSubmission(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Decisions require a recorded note for the contributor-facing paper trail. */
export function submissionTransitionRequiresNote(to: SubmissionStatus): boolean {
  return to === "declined";
}

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: "New",
  in_review: "In review",
  accepted: "Accepted",
  declined: "Declined",
  published: "Published",
};

// -- Story publishing readiness ------------------------------------------------

export type StoryReadinessInput = {
  slug: string;
  headline: string;
  summary: string | null;
  bodyBlockCount: number;
  contributorId: string | null;
  categoryId: string | null;
  leadImageId: string | null;
  leadImageAlt: string | null;
  seoDescription: string | null;
};

export type ReadinessIssue = { field: string; message: string; blocking: boolean };

/**
 * What must be true before a story goes live. Blocking issues mirror the
 * database trigger; non-blocking ones are editorial advice shown in the UI.
 */
export function storyReadiness(input: StoryReadinessInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!input.headline.trim()) issues.push({ field: "headline", message: "Add a headline.", blocking: true });
  if (!input.slug.trim()) issues.push({ field: "slug", message: "Add a URL slug.", blocking: true });
  if (input.bodyBlockCount < 1) issues.push({ field: "body", message: "Write the story body.", blocking: true });
  if (!input.contributorId) issues.push({ field: "contributorId", message: "Choose a contributor.", blocking: true });
  if (!input.categoryId) issues.push({ field: "categoryId", message: "Choose a category.", blocking: true });
  if (!input.leadImageId) {
    issues.push({ field: "leadImageId", message: "Choose a lead image.", blocking: true });
  } else if (!input.leadImageAlt || !input.leadImageAlt.trim()) {
    issues.push({
      field: "leadImageId",
      message: "The lead image needs alternative text.",
      blocking: true,
    });
  }
  if (!input.summary || !input.summary.trim()) {
    issues.push({ field: "summary", message: "A short summary improves cards and search snippets.", blocking: false });
  }
  if (!input.seoDescription || !input.seoDescription.trim()) {
    issues.push({ field: "seoDescription", message: "Add a meta description (falls back to the summary).", blocking: false });
  }
  return issues;
}

export function blockingIssues(issues: readonly ReadinessIssue[]): ReadinessIssue[] {
  return issues.filter((issue) => issue.blocking);
}

/** Derived live/scheduled/draft state used in admin lists. */
export type StoryLifecycle = "draft" | "scheduled" | "live" | "archived";

export function storyLifecycle(
  status: "draft" | "published" | "archived",
  publishedAt: string | null,
  now: Date = new Date(),
): StoryLifecycle {
  if (status === "archived") return "archived";
  if (status === "draft") return "draft";
  if (publishedAt && new Date(publishedAt).getTime() > now.getTime()) return "scheduled";
  return "live";
}
