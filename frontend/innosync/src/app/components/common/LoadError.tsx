"use client";
import styles from "./LoadError.module.css";

/**
 * Shown in place of a list when its data couldn't be loaded. Better than sample data: a visitor
 * can tell the real list is missing, and Retry usually works once a sleeping free-tier API wakes up.
 */
export default function LoadError({
  what,
  onRetry,
  retrying = false,
}: {
  /** e.g. "talents", "projects" */
  what: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    // "rise-in" is a global class: a CSS module would rename the keyframes.
    <div className={`${styles.box} rise-in`} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M5 12.9a10 10 0 0 1 3.5-2.2M19 12.9a10 10 0 0 0-2.4-1.7M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
        </svg>
      </span>
      <h3 className={styles.title}>Couldn&apos;t load {what}</h3>
      <p className={styles.text}>
        The server didn&apos;t answer. If nobody has used the demo for a while it may still be waking up,
        which can take up to a minute.
      </p>
      <button type="button" className={styles.retry} onClick={onRetry} disabled={retrying}>
        {retrying ? <><span className="spinner" aria-hidden="true" /> Trying again…</> : "Try again"}
      </button>
    </div>
  );
}
