import "server-only";
import {
  flattenIssues,
  submissionDecisionSchema,
  type SubmissionDecisionInput,
} from "@/lib/editorial/schemas";
import {
  canTransitionSubmission,
  submissionTransitionRequiresNote,
  type SubmissionStatus,
} from "@/lib/workflow";
import type { Db } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { describeDbError, fail, ok, type Result } from "./types";

export function parseDecisionInput(raw: unknown): Result<SubmissionDecisionInput> {
  const parsed = submissionDecisionSchema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : fail("Please fix the highlighted fields.", flattenIssues(parsed.error));
}

/**
 * Move a submission through the review workflow.
 * Submissions are NEVER published automatically: the only route to
 * "published" is an editor linking an existing, live story.
 */
export async function transitionSubmission(
  db: Db,
  actorId: string,
  input: SubmissionDecisionInput,
): Promise<Result<{ status: SubmissionStatus }>> {
  const { data: current, error } = await db
    .from("submissions")
    .select("id, status, story_id")
    .eq("id", input.submissionId)
    .maybeSingle();
  if (error) return fail(describeDbError(error));
  if (!current) return fail("That submission could not be found.");

  const from = current.status as SubmissionStatus;
  const to = input.status;
  if (from === to) {
    // Same status: only allow updating the note.
    const { error: noteError } = await db
      .from("submissions")
      .update({ decision_note: input.note })
      .eq("id", input.submissionId);
    if (noteError) return fail(describeDbError(noteError));
    return ok({ status: to });
  }
  if (!canTransitionSubmission(from, to)) {
    return fail(`A submission can’t move from “${from}” to “${to}”.`);
  }
  if (submissionTransitionRequiresNote(to) && !input.note) {
    return fail("Add a short note recording why this was declined.", { note: "A note is required when declining." });
  }

  let storyId = current.story_id;
  if (to === "published") {
    storyId = input.storyId ?? current.story_id;
    if (!storyId) return fail("Link the published story before marking this submission as published.", { storyId: "Choose the story." });
    const { data: story, error: storyError } = await db
      .from("stories")
      .select("id, status, published_at")
      .eq("id", storyId)
      .maybeSingle();
    if (storyError) return fail(describeDbError(storyError));
    const live = story && story.status === "published" && story.published_at && new Date(story.published_at) <= new Date();
    if (!live) return fail("The linked story must be published first.", { storyId: "That story isn’t live yet." });
  } else if (input.storyId) {
    storyId = input.storyId;
  }

  const decided = to === "accepted" || to === "declined" || to === "published";
  const { error: updateError } = await db
    .from("submissions")
    .update({
      status: to,
      decision_note: input.note,
      story_id: storyId,
      decided_by: decided ? actorId : null,
      decided_at: decided ? new Date().toISOString() : null,
    })
    .eq("id", input.submissionId);
  if (updateError) return fail(describeDbError(updateError));

  // Audit records the transition only, never the submitter's content.
  await writeAudit(db, actorId, "submission.status_changed", "submission", input.submissionId, { from, to });
  return ok({ status: to });
}
