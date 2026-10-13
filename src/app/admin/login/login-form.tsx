"use client";

import { useActionState, useState } from "react";
import { SubmitButton, FormBanner } from "@/components/admin/form-controls";
import { Field, inputClass } from "@/components/admin/ui";
import { idleState } from "@/lib/editorial/form-state";
import { signInAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, idleState);
  // React resets uncontrolled fields after a form action; keep the email so a
  // typo in the password doesn't force retyping everything.
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormBanner state={state} />
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
