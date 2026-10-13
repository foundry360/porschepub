import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { brand } from "@/config/brand";
import { requireEditor } from "@/server/auth/session";
import { ThemeToggle } from "@/components/site/theme";
import { signOutAction } from "../login/actions";

// Every admin screen is request-time (cookies + per-user data), never prerendered.
export const instant = false;

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/submissions", label: "Submissions", badge: true },
  { href: "/admin/contributors", label: "Contributors" },
  { href: "/admin/taxonomy", label: "Categories & tags" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/homepage", label: "Homepage" },
] as const;

const ADMIN_NAV = [
  { href: "/admin/team", label: "Team" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

async function Shell({ children }: { children: ReactNode }) {
  // The real authentication/authorization gate for every admin page.
  const editor = await requireEditor();
  const { count: newSubmissions } = await editor.db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");

  const links = editor.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-paper-deep lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:py-6">
          <div>
            <Link href="/admin" className="font-display text-[1.35rem] leading-none">
              {brand.shortName}
            </Link>
            <p className="eyebrow mt-1 text-accent">Editorial</p>
          </div>
          <Link href="/" className="text-[0.8rem] underline underline-offset-4 lg:mt-3 lg:inline-block" target="_blank" rel="noopener">
            View site
          </Link>
        </div>
        <nav aria-label="Editorial" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-0.5 lg:pb-6">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 text-[0.92rem] hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
            >
              {item.label}
              {"badge" in item && newSubmissions ? (
                <span className="rounded-full bg-accent px-2 text-[0.72rem] font-semibold text-paper">{newSubmissions}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 text-[0.82rem] lg:block">
          <p className="font-semibold">{editor.displayName}</p>
          <p className="text-stone">{editor.email}</p>
          <p className="mt-1 text-[0.72rem] uppercase tracking-[0.12em] text-stone">{editor.role}</p>
          <div className="mt-3 flex items-center justify-between">
            <form action={signOutAction}>
              <button type="submit" className="underline underline-offset-4 hover:text-accent">
                Sign out
              </button>
            </form>
            <ThemeToggle showLabel className="-mr-2 h-8" />
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {children}
        <div className="mt-12 flex items-center justify-between border-t border-line pt-4 text-[0.82rem] lg:hidden">
          <form action={signOutAction}>
            <button type="submit" className="underline underline-offset-4">
              Sign out ({editor.displayName})
            </button>
          </form>
          <ThemeToggle showLabel className="h-8" />
        </div>
      </main>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-10 text-stone">Loading…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
