"use client";
import { useEffect, useRef } from "react";

/**
 * Thin green line at the top of a long page that fills as you scroll.
 * Place it as the first child of a `.scroll-page` container. Updates go straight to a CSS variable
 * (once per frame), so scrolling never re-renders the page.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    const scroller = bar?.parentElement;
    if (!bar || !scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      bar.style.setProperty("--progress", max > 0 ? String(scroller.scrollTop / max) : "0");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className="scroll-progress" aria-hidden="true" />;
}
