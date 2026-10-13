"use client";

import { useActionState, useCallback, startTransition, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { idleState, type FormState } from "@/lib/editorial/form-state";
import { buttonClass, Notice } from "./ui";

/**
 * React 19 resets uncontrolled form fields after a form `action` completes,
 * which would wipe an editor's input when validation fails. This hook submits
 * through `onSubmit` instead so the fields keep what the editor typed, while
 * still using a Server Action and `useActionState` for the result.
 */
export function useActionForm(action: (previous: FormState, formData: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, idleState);
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );
  return { state, onSubmit, pending };
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = buttonClass,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  /** Pass the `pending` from `useActionForm`; falls back to `useFormStatus`. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Success / error banner for a server-action form state. */
export function FormBanner({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return (
    <div aria-live="polite">
      <Notice tone={state.status === "ok" ? "success" : "error"}>{state.message}</Notice>
    </div>
  );
}

export function fieldError(state: FormState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name] : undefined;
}
