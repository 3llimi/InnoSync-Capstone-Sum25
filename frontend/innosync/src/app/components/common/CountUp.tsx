"use client";
import React, { useEffect, useState } from "react";
import { useInView } from "./Reveal";

/** Animates 0 -> target once `start` is true. Respects prefers-reduced-motion. */
export function useCountUp(target: number | null, start = true, durationMs = 900): number | null {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (target === null || !start) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, durationMs]);

  return target === null ? null : value ?? 0;
}

/** A number that counts up the first time it scrolls into view. Shows `fallback` until the value is known. */
export default function CountUp({
  value,
  suffix = "",
  fallback = "-",
  className,
}: {
  value: number | null;
  suffix?: string;
  fallback?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.3);
  const shown = useCountUp(value, inView);
  return (
    <span ref={ref} className={className} aria-live="polite">
      {value === null ? fallback : `${shown ?? 0}${suffix}`}
    </span>
  );
}
