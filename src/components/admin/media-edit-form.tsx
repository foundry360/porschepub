"use client";

import { updateMediaAction } from "@/app/admin/(console)/media/actions";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import { Field, inputClass } from "./ui";

export function MediaEditForm({
  asset,
}: {
  asset: { id: string; altText: string; caption: string; credit: string; licenseNote: string; sourceNote: string };
}) {
  const { state, onSubmit, pending } = useActionForm(updateMediaAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={asset.id} />
      <FormBanner state={state} />
      <Field label="Alt text" htmlFor="altText" required error={fieldError(state, "altText")} hint="Describe what the image shows. Required for the lead image of a published story.">
        <textarea id="altText" name="altText" rows={2} defaultValue={asset.altText} maxLength={500} className={inputClass} />
      </Field>
      <Field label="Caption" htmlFor="caption" error={fieldError(state, "caption")}>
        <input id="caption" name="caption" defaultValue={asset.caption} maxLength={500} className={inputClass} />
      </Field>
      <Field label="Credit" htmlFor="credit" error={fieldError(state, "credit")}>
        <input id="credit" name="credit" defaultValue={asset.credit} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Licence note (private)" htmlFor="licenseNote" error={fieldError(state, "licenseNote")}>
        <textarea id="licenseNote" name="licenseNote" rows={2} defaultValue={asset.licenseNote} maxLength={1000} className={inputClass} />
      </Field>
      <Field label="Source note (private)" htmlFor="sourceNote" error={fieldError(state, "sourceNote")}>
        <textarea id="sourceNote" name="sourceNote" rows={2} defaultValue={asset.sourceNote} maxLength={1000} className={inputClass} />
      </Field>
      <SubmitButton pending={pending}>Save image details</SubmitButton>
    </form>
  );
}
