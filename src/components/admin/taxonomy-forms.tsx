"use client";

import { renameTagAction, saveCategoryAction } from "@/app/admin/(console)/taxonomy/actions";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import { Field, inputClass } from "./ui";

export function CategoryForm({
  category,
}: {
  category?: { id: string; name: string; slug: string; description: string; sortOrder: number };
}) {
  const { state, onSubmit, pending } = useActionForm(saveCategoryAction);
  const p = category ? `cat-${category.id}` : "cat-new";
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]" noValidate>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label="Name" htmlFor={`${p}-name`} required error={fieldError(state, "name")}>
        <input id={`${p}-name`} name="name" defaultValue={category?.name} maxLength={80} className={inputClass} />
      </Field>
      <Field label="Slug" htmlFor={`${p}-slug`} hint="Empty = from name." error={fieldError(state, "slug")}>
        <input id={`${p}-slug`} name="slug" defaultValue={category?.slug} className={inputClass} />
      </Field>
      <Field label="Order" htmlFor={`${p}-order`} error={fieldError(state, "sortOrder")}>
        <input id={`${p}-order`} name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className={inputClass} />
      </Field>
      <div className="sm:col-span-3">
        <Field label="Description" htmlFor={`${p}-desc`} error={fieldError(state, "description")}>
          <textarea id={`${p}-desc`} name="description" rows={2} defaultValue={category?.description} maxLength={600} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-4 sm:col-span-3">
        <SubmitButton pending={pending}>{category ? "Save category" : "Add category"}</SubmitButton>
        <FormBanner state={state} />
      </div>
    </form>
  );
}

export function TagRenameForm({ tag }: { tag: { id: string; name: string } }) {
  const { state, onSubmit, pending } = useActionForm(renameTagAction);
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="id" value={tag.id} />
      <label htmlFor={`tag-${tag.id}`} className="sr-only">
        Tag name
      </label>
      <input id={`tag-${tag.id}`} name="name" defaultValue={tag.name} maxLength={60} className={`${inputClass} w-56`} />
      <SubmitButton pending={pending} pendingLabel="…" className="border border-ink px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.1em] hover:bg-ink hover:text-paper">
        Rename
      </SubmitButton>
      {state.status === "error" ? <span role="alert" className="text-[0.8rem] text-danger">{state.message}</span> : null}
      {state.status === "ok" ? <span className="text-[0.8rem] text-emerald-800">Saved</span> : null}
    </form>
  );
}
