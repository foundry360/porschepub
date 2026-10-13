import type { ReactNode } from "react";
import type { StoryLifecycle } from "@/lib/workflow";

export const inputClass =
  "block w-full rounded-none border border-line bg-surface px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-mist focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 aria-[invalid=true]:border-accent";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 border border-ink bg-ink px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center gap-2 border border-ink bg-transparent px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export const buttonDangerClass =
  "inline-flex items-center justify-center gap-2 border border-accent bg-transparent px-4 py-2.5 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export function AdminHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
      <div>
        <h1 className="font-display text-[2.2rem] leading-none">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-[0.95rem] text-stone">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-charcoal">
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-[0.82rem] text-stone">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[0.85rem] font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const parts = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const styles = {
    info: "border-line bg-paper-deep text-charcoal",
    success: "border-emerald-700 bg-emerald-50 text-emerald-950",
    error: "border-accent bg-red-50 text-accent-deep",
    warning: "border-amber-600 bg-amber-50 text-amber-950",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border-l-4 px-4 py-3 text-[0.92rem] ${styles[tone]}`}
    >
      {children}
    </div>
  );
}

const LIFECYCLE_STYLE: Record<StoryLifecycle, string> = {
  draft: "bg-paper-deep text-charcoal",
  scheduled: "bg-amber-100 text-amber-950",
  live: "bg-emerald-100 text-emerald-950",
  archived: "bg-stone/15 text-stone",
};

export function LifecycleBadge({ lifecycle }: { lifecycle: StoryLifecycle }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${LIFECYCLE_STYLE[lifecycle]}`}
    >
      {lifecycle}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "ok" }) {
  const styles = {
    neutral: "bg-paper-deep text-charcoal",
    accent: "bg-accent/10 text-accent-deep",
    ok: "bg-emerald-100 text-emerald-950",
  } as const;
  return (
    <span className={`inline-block px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-surface p-5 ${className}`}>
      {title ? <h2 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-charcoal">{title}</h2> : null}
      {children}
    </section>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-line bg-surface px-5 py-10 text-center text-stone">{children}</p>;
}
