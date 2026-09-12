"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The source system's reveal pattern: observe once, flip a boolean, let CSS
 * transitions do the work. Deliberately not a motion library — the whole design
 * language is CSS transitions on opacity and translate.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Users who ask for reduced motion get the end state immediately rather than
    // a fade they didn't want.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
