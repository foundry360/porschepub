"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Thin progress rule + reading-progression analytics. Milestone events are
 * fired once each and contain only the story slug, never personal data.
 */
export function ReadingProgress({ slug, targetId }: { slug: string; targetId: string }) {
  const [progress, setProgress] = useState(0);
  const fired = useRef(new Set<number>());

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.5;
      const read = Math.min(Math.max(-rect.top + window.innerHeight * 0.4, 0), Math.max(total, 1));
      const percent = Math.min(100, Math.round((read / Math.max(total, 1)) * 100));
      setProgress(percent);
      for (const milestone of MILESTONES) {
        if (percent >= milestone && !fired.current.has(milestone)) {
          fired.current.add(milestone);
          track("Story Read Progress", { slug, percent: milestone });
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [slug, targetId]);

  return (
    <div aria-hidden className="no-print pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px]">
      <div
        className="h-full origin-left bg-accent transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
