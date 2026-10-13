"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type RevealEffect = "zoom" | "from-left";

/**
 * Animates its children in every time it scrolls into view, and resets them
 * once it leaves. Content stays fully visible without JavaScript or when the
 * visitor prefers reduced motion.
 */
export function RevealOnView({
  children,
  effect,
  className = "",
}: {
  children: ReactNode;
  effect: RevealEffect;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    element.dataset.reveal = "ready";
    const observer = new IntersectionObserver(
      ([entry]) => {
        element.dataset.reveal = entry.isIntersecting ? "in" : "ready";
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-effect={effect} className={className}>
      {children}
    </div>
  );
}
