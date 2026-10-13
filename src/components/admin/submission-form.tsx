"use client";

import { useState } from "react";
import { updateSubmissionAction } from "@/app/admin/(console)/submissions/actions";
import { SUBMISSION_STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import { Field, inputClass } from "./ui";

export function SubmissionForm({
  submissionId,
  current,
  allowed,
  note,
  storyId,
  liveStories,
}: {
  submissionId: string;
  current: SubmissionStatus;
  allowed: SubmissionStatus[];
  note: string;
  storyId: string;
  liveStories: Array<{ id: string; headline: string }>;
}) {
  const { state, onSubmit, pending } = useActionForm(updateSubmissionAction);
  const [status, setStatus] = useState<SubmissionStatus>(current);
  const options = [current, ...allowed];

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="submissionId" value={submissionId} />
      <FormBanner state={state} />
      <Field label="Status" htmlFor="status" error={fieldError(state, "status")}>
        <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)} className={inputClass}>
          {options.map((s) => (
            <option key={s} value={s}>
              {SUBMISSION_STATUS_LABEL[s]}
              {s === current ? " (current)" : ""}
            </option>
          ))}
        </select>
      </Field>
      {status === "published" || storyId ? (
        <Field
          label="Linked story"
          htmlFor="storyId"
          hint="Submissions are never published automatically. Write and publish the story first, then link it here."
          error={fieldError(state, "storyId")}
        >
          <select id="storyId" name="storyId" defaultValue={storyId} className={inputClass}>
            <option value="">None</option>
            {liveStories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.headline}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field
        label="Decision note (internal)"
        htmlFor="note"
        hint={status === "declined" ? "Required when declining. Record the reason; it isn’t sent automatically." : "Optional. Internal only."}
        error={fieldError(state, "note")}
      >
        <textarea id="note" name="note" rows={4} defaultValue={note} maxLength={2000} className={inputClass} />
      </Field>
      <SubmitButton pending={pending}>Update submission</SubmitButton>
    </form>
  );
}
