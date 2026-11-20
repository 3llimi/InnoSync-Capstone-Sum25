"use client";
import React, { useEffect, useState } from "react";
import styles from "./Avatar.module.css";

type AvatarProps = {
  /** Person's name: drives the initials and the (stable) background colour. */
  name: string;
  /** Photo URL. Omit it when the person has no photo, so no request is made. */
  src?: string | null;
  /** Diameter in px. */
  size?: number;
  className?: string;
  /** Adds a soft ring + lift on hover (for avatars inside clickable cards). */
  interactive?: boolean;
};

/** Up to two initials: "Priya Nair" -> "PN", "Madonna" -> "M". */
export function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Stable hue 0-359 derived from the name, so one person is always the same colour. */
function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export default function Avatar({ name, src, size = 48, className = "", interactive = false }: AvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // A new photo URL (e.g. a different person in a reused slot) starts the cycle again.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const hue = hueFor(name || "");
  const showImage = !!src && !failed;

  return (
    <span
      className={`${styles.avatar} ${interactive ? styles.interactive : ""} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.38)),
        background: `linear-gradient(135deg, hsl(${hue} 58% 46%), hsl(${(hue + 32) % 360} 62% 36%))`,
      }}
      role="img"
      aria-label={name}
    >
      <span className={styles.initials} aria-hidden="true">{getInitials(name)}</span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from the API with auth-free GET; sizing is fixed by the wrapper
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${styles.photo} ${loaded ? styles.photoLoaded : ""}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
