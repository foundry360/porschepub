"use client";

import { useEffect, useState } from "react";
import { EditorialImage } from "@/components/ui/editorial-image";
import type { MediaImage } from "@/lib/types";

export type HeroSlide = {
  image: MediaImage;
  position: string;
  /** Extra shading for busy or bright photos, faded in and out with the slide. */
  scrim?: string;
};

const INTERVAL_MS = 7000;

/**
 * Full-bleed hero backdrop that cross-fades between photographs. Rotation can
 * be paused (WCAG 2.2.2) and never starts for people who prefer reduced motion.
 */
export function HeroCarousel({
  slides,
  className = "",
  children,
}: {
  slides: HeroSlide[];
  className?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const rotating = slides.length > 1 && !paused && !reduced;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setActive((index) => (index + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [rotating, slides.length, active]);

  const credit = slides[active]?.image.credit;

  return (
    <section aria-labelledby="hero-heading" className={className}>
      {slides.map((slide, index) => (
        <div
          key={slide.image.id}
          aria-hidden
          className={`hero-slide absolute inset-0 ${index === active ? "is-active" : ""}`}
        >
          <EditorialImage
            image={slide.image}
            sizes="100vw"
            priority={index === 0}
            decorative
            reveal={false}
            className="!absolute inset-0 !aspect-auto h-full w-full"
            imageClassName={slide.position}
          />
          {slide.scrim ? <div className={`absolute inset-0 ${slide.scrim}`} /> : null}
        </div>
      ))}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

      <div className="relative mx-auto w-full max-w-[88rem] px-5 pb-12 pt-32 sm:px-8 sm:pb-20">
        {children}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <p className="text-[0.7rem] uppercase tracking-[0.12em] text-paper/60" aria-live="off">
            {credit ? `Photograph: ${credit}` : null}
          </p>
          {slides.length > 1 ? (
            <div role="group" aria-label="Hero photographs" className="flex items-center gap-3">
              {slides.map((slide, index) => (
                <button
                  key={slide.image.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show photograph ${index + 1} of ${slides.length}`}
                  aria-current={index === active}
                  className="group/dot inline-flex h-8 items-center"
                >
                  <span
                    className={`block h-[2px] rounded-full transition-all duration-500 ${
                      index === active ? "w-10 bg-paper" : "w-5 bg-paper/40 group-hover/dot:bg-paper/70"
                    }`}
                  />
                </button>
              ))}
              {!reduced ? (
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Play hero photographs" : "Pause hero photographs"}
                  className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-paper/40 text-paper transition-colors hover:border-paper"
                >
                  {paused ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
                      <path d="M2 1l7 4-7 4z" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
                      <path d="M2 1h2v8H2zM6 1h2v8H6z" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
