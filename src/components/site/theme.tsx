"use client";

import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const LABEL: Record<ThemePreference, string> = { light: "Light", dark: "Dark" };

/** The theme in effect, as resolved by the head script (stored choice, else the OS on first visit). */
function readTheme(): ThemePreference {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function setTheme(next: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked: the choice simply won't persist.
  }
  document.documentElement.dataset.theme = next;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function Icon({ preference }: { preference: ThemePreference }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true } as const;
  if (preference === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.5v2.25M12 19.25v2.25M2.5 12h2.25M19.25 12h2.25M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

/** Switches between the light and dark themes; the choice is remembered. */
export function ThemeToggle({ className = "", showLabel = false }: { className?: string; showLabel?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as const);
  const next: ThemePreference = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Colour theme: ${LABEL[theme]}. Switch to ${LABEL[next]}.`}
      title={`Switch to ${LABEL[next].toLowerCase()} theme`}
      className={`inline-flex h-11 items-center gap-2 px-2 text-ink transition-colors ${className}`}
    >
      <Icon preference={theme} />
      {showLabel ? <span className="text-[0.8rem]">{LABEL[theme]}</span> : null}
    </button>
  );
}
