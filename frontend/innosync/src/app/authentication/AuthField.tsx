"use client";
import React, { useId, useState } from "react";
import styles from "./page.module.css";

const ICONS = {
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
};

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  icon: keyof typeof ICONS;
  /** Message shown under the field; also turns the field red. */
  error?: string | false;
  /** Shown at the right edge (e.g. a ✓ when passwords match). */
  adornment?: React.ReactNode;
  hint?: React.ReactNode;
};

/** Labelled input with a leading icon, focus glow, animated error and (for passwords) a show/hide toggle. */
export default function AuthField({ label, icon, error, adornment, hint, type = "text", ...input }: Props) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ""}`}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={styles.fieldControl}>
        <svg className={styles.fieldIcon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[icon]}
        </svg>
        <input
          id={id}
          className={styles.fieldInput}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          {...input}
        />
        {adornment}
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              <path className={styles.revealSlash} d="M4 4l16 16" style={{ opacity: reveal ? 0 : 1 }} />
            </svg>
          </button>
        )}
      </div>
      {hint}
      {error && (
        <p id={`${id}-err`} className={styles.fieldMessage} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
