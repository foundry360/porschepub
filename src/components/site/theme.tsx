"use client";

import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABEL: Record<ThemePreference, string> = { system: "Auto", light: "Light", dark: "Dark" };

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setPreference(next: ThemePreference) {
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked: the choice simply won't persist.
    document.documentElement.dataset.theme = next === "system" ? "light" : next;
  }
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
  if (preference === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Cycles Auto (follow the OS) -> Light -> Dark. */
export function ThemeToggle({ className = "", showLabel = false }: { className?: string; showLabel?: boolean }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Colour theme: ${LABEL[preference]}. Switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[preference]}`}
      className={`inline-flex h-11 items-center gap-2 px-2 text-ink transition-colors ${className}`}
    >
      <Icon preference={preference} />
      {showLabel ? <span className="text-[0.8rem]">{LABEL[preference]}</span> : null}
    </button>
  );
}
