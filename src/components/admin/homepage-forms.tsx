"use client";

import { saveHeroAction, savePlacementsAction } from "@/app/admin/(console)/homepage/actions";
import { fieldError, FormBanner, SubmitButton, useActionForm } from "./form-controls";
import { Field, inputClass } from "./ui";

export function HeroForm({ hero }: { hero: { kicker: string; headline: string; intro: string } }) {
  const { state, onSubmit, pending } = useActionForm(saveHeroAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormBanner state={state} />
      <Field label="Kicker" htmlFor="kicker" error={fieldError(state, "kicker")}>
        <input id="kicker" name="kicker" defaultValue={hero.kicker} maxLength={60} className={inputClass} />
      </Field>
      <Field label="Headline" htmlFor="headline" required error={fieldError(state, "headline")}>
        <input id="headline" name="headline" defaultValue={hero.headline} maxLength={120} className={inputClass} />
      </Field>
      <Field label="Intro" htmlFor="intro" error={fieldError(state, "intro")}>
        <textarea id="intro" name="intro" rows={3} defaultValue={hero.intro} maxLength={300} className={inputClass} />
      </Field>
      <SubmitButton pending={pending}>Save hero text</SubmitButton>
    </form>
  );
}

type StoryOption = { id: string; headline: string };

export function PlacementsForm({
  stories,
  featuredId,
  pickIds,
}: {
  stories: StoryOption[];
  featuredId: string;
  pickIds: string[];
}) {
  const { state, onSubmit, pending } = useActionForm(savePlacementsAction);
  const slots = Array.from({ length: 4 }, (_, i) => pickIds[i] ?? "");
  const options = (
    <>
      <option value="">None (automatic)</option>
      {stories.map((s) => (
        <option key={s.id} value={s.id}>
          {s.headline}
        </option>
      ))}
    </>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormBanner state={state} />
      <Field label="Featured story" htmlFor="featuredId" hint="The large story under the hero. Empty uses your newest story.">
        <select id="featuredId" name="featuredId" defaultValue={featuredId} className={inputClass}>
          {options}
        </select>
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-charcoal">Editors’ picks, in order</legend>
        {slots.map((id, i) => (
          <div key={i}>
            <label htmlFor={`pick-${i}`} className="sr-only">
              Pick {i + 1}
            </label>
            <select id={`pick-${i}`} name="pickId" defaultValue={id} className={inputClass}>
              {options}
            </select>
          </div>
        ))}
        <p className="text-[0.8rem] text-stone">Only live stories can be placed. Empty slots are filled automatically with recent stories.</p>
      </fieldset>
      <SubmitButton pending={pending}>Save selections</SubmitButton>
    </form>
  );
}
