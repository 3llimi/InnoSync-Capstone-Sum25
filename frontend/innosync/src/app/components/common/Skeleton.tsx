import React from "react";
import styles from "./Skeleton.module.css";

type BlockProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
};

/** A single shimmering placeholder block. */
export function SkeletonBlock({ width = "100%", height = 14, radius, className = "" }: BlockProps) {
  return (
    <span
      className={`skeleton ${styles.block} ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** A circular placeholder, sized like an Avatar. */
export function SkeletonCircle({ size = 48 }: { size?: number }) {
  return <SkeletonBlock width={size} height={size} radius="50%" />;
}

/**
 * Wraps a group of placeholders: one polite announcement for screen readers instead of dozens of empty nodes.
 * `label` is what assistive tech reads, e.g. "Loading projects".
 */
export function SkeletonGroup({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.srOnly}>{label}</span>
      {children}
    </div>
  );
}

/** A table-like row: avatar + two text lines + a few columns. Used by Applications/Invitations/Proposals. */
export function SkeletonRow({ index = 0 }: { index?: number }) {
  return (
    <div className={`${styles.row} rise-in`} style={{ ["--i" as string]: index }} aria-hidden="true">
      <div className={styles.rowMain}>
        <SkeletonCircle size={40} />
        <div className={styles.lines}>
          <SkeletonBlock width="55%" height={13} />
          <SkeletonBlock width="35%" height={10} />
        </div>
      </div>
      <SkeletonBlock width="70%" height={12} />
      <SkeletonBlock width="60%" height={12} />
      <SkeletonBlock width={72} height={22} radius={12} />
    </div>
  );
}

/** A card with a banner, title, chips: matches the dashboard project cards. */
export function SkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <div className={`${styles.card} rise-in`} style={{ ["--i" as string]: index }} aria-hidden="true">
      <SkeletonBlock height={120} radius={8} />
      <SkeletonBlock width="70%" height={16} />
      <div className={styles.chips}>
        <SkeletonBlock width={70} height={18} radius={9} />
        <SkeletonBlock width={60} height={18} radius={9} />
        <SkeletonBlock width={84} height={18} radius={9} />
      </div>
    </div>
  );
}

/** A talent/candidate row: avatar, name, badges. */
export function SkeletonPerson({ index = 0 }: { index?: number }) {
  return (
    <div className={`${styles.person} rise-in`} style={{ ["--i" as string]: index }} aria-hidden="true">
      <SkeletonCircle size={60} />
      <div className={styles.lines}>
        <SkeletonBlock width="40%" height={16} />
        <div className={styles.chips}>
          <SkeletonBlock width={90} height={26} radius={13} />
          <SkeletonBlock width={90} height={26} radius={13} />
          <SkeletonBlock width={120} height={26} radius={13} />
        </div>
        <div className={styles.chips}>
          <SkeletonBlock width={48} height={16} radius={8} />
          <SkeletonBlock width={60} height={16} radius={8} />
          <SkeletonBlock width={52} height={16} radius={8} />
        </div>
      </div>
      <SkeletonBlock width={110} height={40} radius={6} />
    </div>
  );
}
