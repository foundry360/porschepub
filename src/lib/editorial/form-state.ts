export type FormState =
  | { status: "idle" }
  | { status: "ok"; message: string; id?: string; slug?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const idleState: FormState = { status: "idle" };

export function errorState(message: string, fieldErrors?: Record<string, string>): FormState {
  return { status: "error", message, fieldErrors };
}

export function okState(message: string, extra: { id?: string; slug?: string } = {}): FormState {
  return { status: "ok", message, ...extra };
}

/** Read a string field from FormData ("" when absent or a File). */
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function formBool(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

/** Comma- or newline-separated list -> trimmed unique items. */
export function formList(formData: FormData, name: string): string[] {
  const raw = formString(formData, name);
  const seen = new Set<string>();
  for (const part of raw.split(/[\n,]/)) {
    const item = part.trim();
    if (item) seen.add(item);
  }
  return [...seen];
}
