"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  rawSubmissionSchema,
  SUBMISSION_LIMITS,
  validateSubmission,
  type SubmissionFieldErrors,
} from "@/lib/validation/submission";
import { submitStoryAction, type SubmissionFormState } from "./actions";

type CategoryOption = { id: string; name: string };

const initialState: SubmissionFormState = { status: "idle" };

const inputClass =
  "mt-2 block w-full rounded-none border-0 border-b border-line bg-transparent px-0 py-3 text-[1.05rem] text-ink placeholder:text-mist focus:border-accent focus:shadow-[0_1px_0_0_var(--color-accent)] focus:outline-none aria-[invalid=true]:border-accent";

function Field({
  id,
  label,
  hint,
  error,
  required = true,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { "aria-describedby": string | undefined; "aria-invalid": boolean }) => React.ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-stone">
        {label}
        {required ? (
          <span aria-hidden className="text-accent">
            {" "}
            *
          </span>
        ) : (
          <span className="normal-case tracking-normal text-mist"> (optional)</span>
        )}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[0.85rem] text-stone">
          {hint}
        </p>
      ) : null}
      {children({ "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[0.9rem] font-medium text-accent-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmissionForm({
  categories,
  turnstileSiteKey,
}: {
  categories: CategoryOption[];
  turnstileSiteKey?: string;
}) {
  const [state, formAction, pending] = useActionState(submitStoryAction, initialState);
  const [clientErrors, setClientErrors] = useState<SubmissionFieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const mountedAt = useRef<number>(0);
  const elapsedRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const serverErrors = state.status === "error" ? (state.errors ?? {}) : {};
  const errors: SubmissionFieldErrors = { ...serverErrors, ...clientErrors };
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const hasErrors = Object.keys(errors).length > 0 || state.status === "error";

  useEffect(() => {
    if (state.status === "success") {
      track("Submission Succeeded");
      summaryRef.current?.focus();
    } else if (state.status === "error") {
      track("Submission Failed");
      summaryRef.current?.focus();
    }
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    if (elapsedRef.current) elapsedRef.current.value = String(Date.now() - mountedAt.current);

    // Same rules as the server, for faster feedback. The server stays authoritative.
    const data = new FormData(form);
    const raw = rawSubmissionSchema.parse(
      Object.fromEntries(Array.from(data.entries()).filter(([, value]) => typeof value === "string")),
    );
    const result = validateSubmission(raw);
    if (!result.ok) {
      event.preventDefault();
      setClientErrors(result.errors);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setClientErrors({});
  }

  function markStarted() {
    if (!started.current) {
      started.current = true;
      track("Submission Started");
    }
  }

  if (state.status === "success") {
    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        role="status"
        className="animate-fade-up rounded-[20px] border border-line bg-paper-deep px-6 py-10 outline-none sm:px-10"
      >
        <h2 className="font-headline text-[2.25rem]">Pitch received</h2>
        <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-charcoal">{state.message}</p>
        <Link href="/stories" className="eyebrow link-underline mt-8 inline-block">
          Read the stories
        </Link>
      </div>
    );
  }

  const errorEntries = Object.entries(errors) as Array<[string, string]>;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      onFocusCapture={markStarted}
      noValidate
      className="space-y-8"
    >
      <div ref={summaryRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {hasErrors ? (
          <div role="alert" className="border border-accent bg-surface/70 px-5 py-4">
            <p className="font-medium text-accent-deep">
              {state.status === "error" && state.message ? state.message : "Please check the highlighted fields."}
            </p>
            {errorEntries.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-[0.9rem]">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#field-${field}`} className="underline">
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="field-website">Leave this field empty</label>
        <input id="field-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="elapsedMs" ref={elapsedRef} defaultValue="" />

      <div className="grid gap-8 sm:grid-cols-2">
        <Field id="field-name" label="Your name" error={errors.name}>
          {(a11y) => (
            <input
              id="field-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={SUBMISSION_LIMITS.name.max}
              defaultValue={values.name}
              className={inputClass}
              {...a11y}
            />
          )}
        </Field>
        <Field id="field-email" label="Email address" error={errors.email}>
          {(a11y) => (
            <input
              id="field-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              defaultValue={values.email}
              className={inputClass}
              {...a11y}
            />
          )}
        </Field>
      </div>

      <Field id="field-title" label="Working title for your story" error={errors.title}>
        {(a11y) => (
          <input
            id="field-title"
            name="title"
            type="text"
            maxLength={SUBMISSION_LIMITS.title.max}
            defaultValue={values.title}
            className={inputClass}
            {...a11y}
          />
        )}
      </Field>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field
          id="field-subject"
          label="Porsche model or subject"
          error={errors.subject}
        >
          {(a11y) => (
            <input
              id="field-subject"
              name="subject"
              type="text"
              maxLength={SUBMISSION_LIMITS.subject.max}
              defaultValue={values.subject}
              className={inputClass}
              {...a11y}
            />
          )}
        </Field>
        <Field id="field-categoryId" label="Category" error={errors.categoryId}>
          {(a11y) => (
            <select
              id="field-categoryId"
              name="categoryId"
              defaultValue={values.categoryId ?? ""}
              className={inputClass}
              {...a11y}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field
        id="field-pitch"
        label="Your story"
        hint={`Tell us the story in your own words: who, what, and why it matters. ${SUBMISSION_LIMITS.pitch.min}–${SUBMISSION_LIMITS.pitch.max} characters.`}
        error={errors.pitch}
      >
        {(a11y) => (
          <textarea
            id="field-pitch"
            name="pitch"
            rows={9}
            maxLength={SUBMISSION_LIMITS.pitch.max}
            defaultValue={values.pitch}
            className={inputClass}
            {...a11y}
          />
        )}
      </Field>

      <Field
        id="field-portfolioUrl"
        label="Portfolio or social profile"
        hint="A link to your writing, photography, or a social profile."
        error={errors.portfolioUrl}
        required={false}
      >
        {(a11y) => (
          <input
            id="field-portfolioUrl"
            name="portfolioUrl"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://"
            defaultValue={values.portfolioUrl}
            className={inputClass}
            {...a11y}
          />
        )}
      </Field>

      <Field
        id="field-additionalInfo"
        label="Anything else we should know"
        error={errors.additionalInfo}
        required={false}
      >
        {(a11y) => (
          <textarea
            id="field-additionalInfo"
            name="additionalInfo"
            rows={4}
            maxLength={SUBMISSION_LIMITS.additionalInfo.max}
            defaultValue={values.additionalInfo}
            className={inputClass}
            {...a11y}
          />
        )}
      </Field>

      <div>
        <div className="flex items-start gap-3">
          <input
            id="field-consent"
            name="consent"
            type="checkbox"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "field-consent-error" : undefined}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <label htmlFor="field-consent" className="text-[0.95rem] leading-snug">
            I have read and accept the{" "}
            <Link href="/submission-terms" target="_blank" className="link-underline">
              submission terms
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" target="_blank" className="link-underline">
              privacy policy
            </Link>
            , and I understand that sending a pitch does not guarantee it will be published.
            <span aria-hidden className="text-accent">
              {" "}
              *
            </span>
          </label>
        </div>
        {errors.consent ? (
          <p id="field-consent-error" className="mt-2 text-[0.9rem] font-medium text-accent-deep">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2.5 rounded-full border border-ink bg-ink px-8 py-4 text-[0.8125rem] font-medium tracking-[0.02em] text-paper transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send pitch"}
        </button>
        <p className="text-[0.85rem] text-stone" aria-live="polite">
          {pending ? "Saving your pitch…" : "We read every pitch. Fields marked * are required."}
        </p>
      </div>
    </form>
  );
}
