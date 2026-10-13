"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem = { label: string; href: string };

/**
 * Hamburger menu using a native modal <dialog>: focus is trapped, Escape closes,
 * the page behind is inert, and the slide-in animation is pure CSS (disabled
 * under prefers-reduced-motion).
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
        className="group -mr-2 flex h-11 items-center gap-3 px-2 text-ink"
      >
        <span className="eyebrow hidden sm:inline">Menu</span>
        <span aria-hidden className="flex w-7 flex-col items-end gap-[7px]">
          <span className="block h-px w-7 bg-current transition-all duration-300 group-hover:w-5" />
          <span className="block h-px w-5 bg-current transition-all duration-300 group-hover:w-7" />
        </span>
        <span className="sr-only sm:hidden">Open menu</span>
      </button>

      <dialog
        id="site-menu"
        ref={dialogRef}
        className="menu-panel on-dark"
        aria-label="Site menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes the menu.
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-7 pb-10 pt-6 sm:px-12">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-mist">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-2 flex h-11 items-center px-2 text-paper"
            >
              <span className="eyebrow mr-3">Close</span>
              <span aria-hidden className="relative block h-5 w-5">
                <span className="absolute left-0 top-1/2 h-px w-5 rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 h-px w-5 -rotate-45 bg-current" />
              </span>
            </button>
          </div>

          <nav aria-label="Primary" className="mt-12">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="font-display block py-2 text-[2.4rem] leading-tight text-paper transition-colors hover:text-[#f4c9c5] sm:text-5xl"
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {categories.length > 0 ? (
            <nav aria-label="Categories" className="mt-12 border-t border-white/15 pt-8">
              <p className="eyebrow text-mist">Explore</p>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {categories.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block py-1.5 text-[0.95rem] text-paper/85 hover:text-paper"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="mt-auto pt-12">
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="eyebrow inline-block border-b border-paper/50 pb-1 text-paper hover:border-paper"
            >
              Search stories
            </Link>
            {social.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {social.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-paper/75 hover:text-paper"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
