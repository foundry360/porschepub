"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Zooms its `.zoom-item` descendants in the first time it scrolls
 * into view. Content stays fully visible without JavaScript or when the
 * visitor prefers reduced motion.
 */
export function ZoomInOnView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    element.dataset.zoom = "ready";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.zoom = "in";
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
