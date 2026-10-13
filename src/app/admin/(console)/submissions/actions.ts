"use server";

import { revalidatePath } from "next/cache";
import { errorState, formString, okState, type FormState } from "@/lib/editorial/form-state";
import { requireEditor } from "@/server/auth/session";
import { parseDecisionInput, transitionSubmission } from "@/server/editorial/submissions";
import { logger } from "@/server/logger";

export async function updateSubmissionAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await requireEditor();
  const parsed = parseDecisionInput({
    submissionId: formString(formData, "submissionId"),
    status: formString(formData, "status"),
    note: formString(formData, "note"),
    storyId: formString(formData, "storyId"),
  });
  if (!parsed.ok) return errorState(parsed.error, parsed.fieldErrors);

  try {
    const result = await transitionSubmission(db, userId, parsed.data);
    if (!result.ok) return errorState(result.error, result.fieldErrors);
    // Re-render admin screens (status options, new-submission badge). Not public caches.
    revalidatePath("/admin", "layout");
    return okState("Submission updated.");
  } catch (error) {
    // Never log submission content; only the failure.
    logger.error("admin.submission_update_failed", {}, error);
    return errorState("Something went wrong updating this submission.");
  }
}
