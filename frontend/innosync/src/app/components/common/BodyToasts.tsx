"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * ToastContainer rendered straight into <body>.
 *
 * A container placed inside an element that creates a stacking context (isolation, transform,
 * filter, opacity < 1...) can only stack within that element, so a neighbouring panel can paint
 * over it, however high its z-index. In <body> nothing on the page can trap it.
 */
export default function BodyToasts({ label = "Notifications" }: { label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<ToastContainer aria-label={label} />, document.body);
}
