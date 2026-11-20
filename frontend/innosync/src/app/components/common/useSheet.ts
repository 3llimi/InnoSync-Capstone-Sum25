"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SheetState = "closed" | "open" | "closing";

/** Must match the sheet-out animation in projects/page.module.css. */
const CLOSE_MS = 260;

/**
 * Open/close state for a bottom sheet that animates out before it disappears.
 * Escape closes it. Only narrow layouts render the sheet styling; on desktop the state is ignored.
 */
export default function useSheet() {
  const [state, setState] = useState<SheetState>("closed");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setState("open");
  }, []);

  const close = useCallback(() => {
    setState((s) => (s === "open" ? "closing" : s));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("closed"), CLOSE_MS);
  }, []);

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { state, open, close };
}
