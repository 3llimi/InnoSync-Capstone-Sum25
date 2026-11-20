"use client";
import React, { Children, isValidElement, useLayoutEffect, useRef, useState } from "react";

/**
 * Animates a keyed list whenever its children change (filtering, sorting, removing):
 * - items that stay glide from their old spot to the new one (FLIP),
 * - items that leave fade/shrink out while the rest close the gap,
 * - items that arrive fade/rise in, lightly staggered.
 * Each child must have a stable `key`. Children are wrapped in a <div> (or `itemAs`), so give
 * layout classes to `className` (the container) and `itemClassName` (each wrapper).
 */

type Rect = { x: number; y: number; w: number; h: number };
type Entry = { key: React.Key; node: React.ReactElement; leaving: boolean };

const ENTER_MS = 320;
const MOVE_MS = 420;
const LEAVE_MS = 220;
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function AnimatedList({
  children,
  className = "",
  itemClassName = "",
  as: Tag = "div",
  appear = true,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  as?: "div" | "ul" | "ol";
  /** Animate items in on first mount too. */
  appear?: boolean;
}) {
  const items = Children.toArray(children).filter(isValidElement) as React.ReactElement[];

  const [entries, setEntries] = useState<Entry[]>(() => items.map((node) => ({ key: node.key!, node, leaving: false })));
  const containerRef = useRef<HTMLElement | null>(null);
  const nodes = useRef(new Map<React.Key, HTMLElement>());
  const before = useRef<Map<React.Key, Rect> | null>(null);
  const mounted = useRef(false);

  /** Where every item is on screen right now (including any in-flight animation). */
  const snapshot = () => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const map = new Map<React.Key, Rect>();
    nodes.current.forEach((el, key) => {
      const r = el.getBoundingClientRect();
      map.set(key, { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height });
    });
    before.current = map;
  };

  // 1) Children changed: record positions, then merge (leaving items stay rendered for their exit).
  useLayoutEffect(() => {
    if (!mounted.current) return;
    snapshot();
    setEntries((prev) => {
      const nextKeys = new Set<React.Key>(items.map((n) => n.key!));
      const merged: Entry[] = items.map((node) => ({ key: node.key!, node, leaving: false }));
      // Re-insert leaving items near their previous index so they exit in place.
      prev.forEach((e, i) => {
        if (!nextKeys.has(e.key)) merged.splice(Math.min(i, merged.length), 0, { ...e, leaving: true });
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  // 2) After the DOM updates: play enter / move / leave animations.
  useLayoutEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const first = !mounted.current;
    mounted.current = true;
    const old = before.current;
    before.current = null;
    if (reducedMotion()) {
      if (entries.some((e) => e.leaving)) setEntries((prev) => prev.filter((e) => !e.leaving));
      return;
    }

    if (first) {
      if (!appear) return;
      let i = 0;
      entries.forEach((e) => {
        const el = nodes.current.get(e.key);
        el?.animate(
          [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
          { duration: ENTER_MS, easing: EASE, delay: Math.min(i++, 10) * 40, fill: "backwards" }
        );
      });
      return;
    }
    if (!old) return;

    const cr = c.getBoundingClientRect();

    // Take leaving items out of the flow first, pinned where they were, so others can move into the gap.
    entries.forEach((e) => {
      if (!e.leaving) return;
      const el = nodes.current.get(e.key);
      const r = old.get(e.key);
      if (!el || !r || el.dataset.leaving) return;
      el.dataset.leaving = "1";
      el.getAnimations().forEach((a) => a.cancel());
      Object.assign(el.style, {
        position: "absolute",
        left: `${r.x - c.clientLeft + c.scrollLeft}px`,
        top: `${r.y - c.clientTop + c.scrollTop}px`,
        width: `${r.w}px`,
        height: `${r.h}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: "0",
      });
      const anim = el.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.96)" }],
        { duration: LEAVE_MS, easing: EASE, fill: "forwards" }
      );
      anim.onfinish = () => {
        snapshot();
        // Only drop it if it is still leaving (a filter change may have brought it back meanwhile).
        setEntries((prev) => prev.filter((x) => !(x.key === e.key && x.leaving)));
      };
    });

    let entering = 0;
    entries.forEach((e) => {
      if (e.leaving) return;
      const el = nodes.current.get(e.key);
      if (!el) return;
      let prevRect = old.get(e.key);
      if (el.dataset.leaving) {
        // Came back mid-exit: undo the exit styling and bring it in again.
        delete el.dataset.leaving;
        el.getAnimations().forEach((a) => a.cancel());
        Object.assign(el.style, { position: "", left: "", top: "", width: "", height: "", margin: "", pointerEvents: "", zIndex: "" });
        prevRect = undefined;
      }
      if (!prevRect) {
        el.animate(
          [{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "none" }],
          { duration: ENTER_MS, easing: EASE, delay: 60 + Math.min(entering++, 8) * 35, fill: "backwards" }
        );
        return;
      }
      // Measure the true layout position (without any running transform) and glide from the old one.
      el.getAnimations().forEach((a) => a.cancel());
      const r = el.getBoundingClientRect();
      const dx = prevRect.x - (r.left - cr.left);
      const dy = prevRect.y - (r.top - cr.top);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: MOVE_MS, easing: EASE }
      );
    });
  }, [entries, appear]);

  return (
    <Tag ref={containerRef as React.Ref<never>} className={className} style={{ position: "relative" }}>
      {entries.map((e) => {
        const WrapTag = Tag === "div" ? "div" : "li";
        return (
          <WrapTag
            key={e.key}
            className={itemClassName}
            aria-hidden={e.leaving || undefined}
            ref={(el: HTMLElement | null) => {
              if (el) nodes.current.set(e.key, el);
              else nodes.current.delete(e.key);
            }}
          >
            {e.node}
          </WrapTag>
        );
      })}
    </Tag>
  );
}
