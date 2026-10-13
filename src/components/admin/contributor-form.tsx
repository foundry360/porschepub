"use client";

import { useState } from "react";
import { saveContributorAction } from "@/app/admin/(console)/contributors/actions";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import { ImageField, type ImageInfo } from "./image-field";
import { Card, Field, describedBy, inputClass } from "./ui";

export type ContributorFormValues = {
  id?: string;
  name: string;
  slug: string;
  descriptor: string;
  bio: string;
  expertise: string;
  websiteUrl: string;
  socialUrl: string;
  profileVisible: boolean;
  isHighlighted: boolean;
  email: string;
  notes: string;
};

export function ContributorForm({
  values,
  avatar,
}: {
  values: ContributorFormValues;
  avatar: ImageInfo | null;
}) {
  const { state, onSubmit, pending } = useActionForm(saveContributorAction);
  const [image, setImage] = useState<ImageInfo | null>(avatar);
  const [visible, setVisible] = useState(values.profileVisible);
  const err = (name: string) => fieldError(state, name);

  return (
    <form onSubmit={onSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="previousSlug" value={values.slug} />
      <input type="hidden" name="avatarAssetId" value={image?.id ?? ""} />

      <div className="min-w-0 space-y-5">
        <FormBanner state={state} />
        <Field label="Name" htmlFor="name" required error={err("name")}>
          <input id="name" name="name" defaultValue={values.name} maxLength={120} className={inputClass} aria-invalid={Boolean(err("name"))} aria-describedby={describedBy("name", undefined, err("name"))} />
        </Field>
        <Field label="Descriptor" htmlFor="descriptor" hint="A short line, e.g. “Owner of a 1987 911 Carrera”. Only describe what is true." error={err("descriptor")}>
          <input id="descriptor" name="descriptor" defaultValue={values.descriptor} maxLength={160} className={inputClass} />
        </Field>
        <Field label="Bio" htmlFor="bio" hint="Shown on the public profile. Write only what the contributor has agreed to share." error={err("bio")}>
          <textarea id="bio" name="bio" rows={7} defaultValue={values.bio} maxLength={3000} className={inputClass} />
        </Field>
        <Field label="Expertise" htmlFor="expertise" hint="Comma-separated, e.g. air-cooled 911s, vintage racing." error={err("expertise")}>
          <input id="expertise" name="expertise" defaultValue={values.expertise} className={inputClass} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website" htmlFor="websiteUrl" hint="https:// only." error={err("websiteUrl")}>
            <input id="websiteUrl" name="websiteUrl" defaultValue={values.websiteUrl} className={inputClass} />
          </Field>
          <Field label="Social profile" htmlFor="socialUrl" hint="https:// only." error={err("socialUrl")}>
            <input id="socialUrl" name="socialUrl" defaultValue={values.socialUrl} className={inputClass} />
          </Field>
        </div>
        <Field label="URL slug" htmlFor="slug" hint="Leave empty to generate from the name." error={err("slug")}>
          <input id="slug" name="slug" defaultValue={values.slug} className={inputClass} />
        </Field>
        <SubmitButton pending={pending}>Save contributor</SubmitButton>
      </div>

      <aside className="space-y-5">
        <Card title="Public profile">
          <label className="flex items-start gap-2 text-[0.9rem]">
            <input type="checkbox" name="profileVisible" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="mt-1" />
            <span>
              Show a public profile page
              <span className="block text-[0.8rem] text-stone">
                Off by default. Stories still show the name as a byline. Only enable with the contributor’s consent.
              </span>
            </span>
          </label>
          <label className="mt-4 flex items-start gap-2 text-[0.9rem]">
            <input type="checkbox" name="isHighlighted" defaultChecked={values.isHighlighted} disabled={!visible} className="mt-1" />
            <span>Feature on the homepage contributor section</span>
          </label>
          <div className="mt-5">
            <ImageField label="Portrait (optional)" value={image} onChange={setImage} />
          </div>
        </Card>
        <Card title="Private editorial notes">
          <p className="mb-3 text-[0.8rem] text-stone">Never shown publicly. Visible only to signed-in editors.</p>
          <div className="space-y-4">
            <Field label="Contact email" htmlFor="email" error={err("email")}>
              <input id="email" name="email" type="email" defaultValue={values.email} maxLength={254} className={inputClass} />
            </Field>
            <Field label="Notes" htmlFor="notes" error={err("notes")}>
              <textarea id="notes" name="notes" rows={4} defaultValue={values.notes} maxLength={3000} className={inputClass} />
            </Field>
          </div>
        </Card>
      </aside>
    </form>
  );
}
