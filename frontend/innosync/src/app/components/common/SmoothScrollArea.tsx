"use client";
import React, { useCallback, useEffect, useRef } from "react";
import styles from "./SmoothScrollArea.module.css";

/**
 * A scroll container with a slim custom rail instead of the browser's default scrollbar.
 * - The rail's thumb tracks position, widens on hover and can be dragged.
 * - Soft fades show at whichever edge still has more content.
 * - A small "more below" button nudges people to scroll when the content starts cut off.
 * All per-scroll updates write straight to the DOM (data attributes + CSS variables), so
 * scrolling never re-renders the children.
 */
export default function SmoothScrollArea({
  children,
  className = "",
  viewportClassName = "",
  moreLabel = "Scroll for more",
}: {
  children: React.ReactNode;
  /** Applied to the outer shell (sizing, radius, shadow, background). */
  className?: string;
  /** Applied to the scrolling element itself. */
  viewportClassName?: string;
  moreLabel?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(() => {
    const shell = shellRef.current;
    const vp = viewportRef.current;
    const rail = railRef.current;
    if (!shell || !vp || !rail) return;

    const max = vp.scrollHeight - vp.clientHeight;
    const scrollable = max > 4;
    shell.toggleAttribute("data-scrollable", scrollable);
    shell.toggleAttribute("data-at-top", vp.scrollTop <= 2);
    shell.toggleAttribute("data-at-bottom", !scrollable || vp.scrollTop >= max - 2);
    if (!scrollable) return;

    const track = rail.clientHeight;
    const thumb = Math.max(36, (vp.clientHeight / vp.scrollHeight) * track);
    shell.style.setProperty("--thumb-h", `${thumb}px`);
    shell.style.setProperty("--thumb-y", `${(vp.scrollTop / max) * (track - thumb)}px`);
  }, []);

  const onScroll = useCallback(() => {
    update();
    const shell = shellRef.current;
    if (!shell) return;
    shell.setAttribute("data-scrolling", "");
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => shell.removeAttribute("data-scrolling"), 900);
  }, [update]);

  // Re-measure whenever the viewport or its content changes size (tags added, window resized...).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(vp);
    Array.from(vp.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(() => {
      Array.from(vp.children).forEach((c) => ro.observe(c));
      update();
    });
    mo.observe(vp, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [update]);

  // Dragging the thumb scrolls proportionally; clicking the track jumps a page towards the click.
  const onRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current;
    const rail = railRef.current;
    if (!vp || !rail) return;
    const thumbEl = rail.firstElementChild as HTMLElement | null;
    const onThumb = thumbEl?.contains(e.target as Node);

    if (!onThumb) {
      const rect = thumbEl?.getBoundingClientRect();
      const down = rect ? e.clientY > rect.bottom : true;
      vp.scrollBy({ top: (down ? 1 : -1) * vp.clientHeight * 0.85, behavior: "smooth" });
      return;
    }

    e.preventDefault();
    rail.setPointerCapture(e.pointerId);
    shellRef.current?.setAttribute("data-dragging", "");
    vp.style.scrollBehavior = "auto"; // follow the pointer 1:1 instead of easing behind it
    const startY = e.clientY;
    const startTop = vp.scrollTop;
    const max = vp.scrollHeight - vp.clientHeight;
    const thumbH = thumbEl?.offsetHeight ?? 36;
    const ratio = max / Math.max(1, rail.clientHeight - thumbH);

    const move = (ev: PointerEvent) => {
      vp.scrollTop = startTop + (ev.clientY - startY) * ratio;
    };
    const up = () => {
      rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", up);
      rail.removeEventListener("pointercancel", up);
      shellRef.current?.removeAttribute("data-dragging");
      vp.style.scrollBehavior = "";
    };
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", up);
    rail.addEventListener("pointercancel", up);
  };

  const scrollDown = () => {
    const vp = viewportRef.current;
    vp?.scrollBy({ top: vp.clientHeight * 0.7, behavior: "smooth" });
  };

  return (
    <div ref={shellRef} className={`${styles.shell} ${className}`} data-at-top="">
      <div ref={viewportRef} className={`${styles.viewport} ${viewportClassName}`} onScroll={onScroll}>
        {children}
      </div>

      <span className={`${styles.fade} ${styles.fadeTop}`} aria-hidden="true" />
      <span className={`${styles.fade} ${styles.fadeBottom}`} aria-hidden="true" />

      <div ref={railRef} className={styles.rail} onPointerDown={onRailPointerDown} aria-hidden="true">
        <span className={styles.thumb} />
      </div>

      <button type="button" className={styles.more} onClick={scrollDown} aria-label={moreLabel} tabIndex={-1}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
