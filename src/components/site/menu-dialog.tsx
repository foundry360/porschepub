"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/config/brand";

type NavItem = { label: string; href: string };

function BurgerLines({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-3 w-[18px]">
      <span
        className={`absolute left-0 block h-px w-[18px] bg-current transition-transform duration-300 ${
          open ? "top-1/2 rotate-45" : "top-[3px]"
        }`}
      />
      <span
        className={`absolute left-0 block h-px w-[18px] bg-current transition-transform duration-300 ${
          open ? "top-1/2 -rotate-45" : "bottom-[3px]"
        }`}
      />
    </span>
  );
}

const circleButton =
  "flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-accent";

/**
 * Full-screen menu using a native modal <dialog>: focus is trapped, Escape closes,
 * the page behind is inert, and the reveal animation is pure CSS (disabled under
 * prefers-reduced-motion).
 */
export function MenuDialog({
  items,
  categories,
  social,
}: {
  items: readonly NavItem[];
  categories: readonly NavItem[];
  social: readonly NavItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close after navigation (adjusting state during render is the sanctioned pattern).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        className={circleButton}
      >
        <BurgerLines open={false} />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        id="site-menu"
        ref={dialogRef}
        className="menu-panel on-black"
        aria-label="Site menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <div aria-hidden className="menu-glow" />
        <div className="relative mx-auto flex h-full max-w-[88rem] flex-col overflow-y-auto px-5 pb-10 sm:px-8">
          <div className="flex h-16 shrink-0 items-center justify-between sm:h-20">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2.5 text-[0.9375rem] font-semibold leading-none tracking-[-0.01em] text-ink"
            >
              <span aria-hidden className="block h-2.5 w-2.5 rounded-full bg-accent" />
              {brand.wordmark.text}
            </Link>
            <button type="button" onClick={() => setOpen(false)} className={circleButton}>
              <BurgerLines open />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <div className="my-auto grid gap-12 py-10 lg:grid-cols-12 lg:items-end">
            <nav aria-label="Primary" className="lg:col-span-8">
              <ol>
                {items.map((item, index) => (
                  <li key={item.href} className="menu-item" style={{ transitionDelay: `${120 + index * 60}ms` }}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="font-headline group flex items-baseline gap-5 py-1.5 text-[clamp(2.5rem,8vw,6rem)] text-ink transition-colors hover:text-accent"
                      aria-current={pathname === item.href ? "page" : undefined}
                    >
                      <span className="w-8 shrink-0 font-sans text-[0.75rem] font-medium tracking-[0.1em] text-stone">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="space-y-10 lg:col-span-4">
              <p className="font-display max-w-sm text-[1.6rem] italic leading-tight text-charcoal">{brand.tagline}.</p>
              {categories.length > 0 ? (
                <nav aria-label="Categories">
                  <p className="eyebrow eyebrow-slash text-stone">Explore</p>
                  <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {categories.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="text-[0.9rem] text-charcoal hover:text-accent"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="eyebrow border-b border-stone pb-1 text-ink hover:border-accent"
                >
                  Search stories
                </Link>
                {social.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-stone hover:text-ink"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
