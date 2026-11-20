import React from "react";
import styles from "./ProjectBanner.module.css";

// One palette per project type, so a glance at a card tells you what kind of project it is.
const PALETTES: Record<string, [string, string]> = {
  ACADEMIC: ["#2563eb", "#7c3aed"],
  FREELANCE: ["#0f766e", "#22c55e"],
  RESEARCH: ["#9333ea", "#ec4899"],
  HACKATHON: ["#ea580c", "#dc2626"],
};
const FALLBACK: [string, string] = ["#298217", "#1d6b4f"];

const LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  FREELANCE: "Freelance",
  RESEARCH: "Research",
  HACKATHON: "Hackathon",
};

/** CSS gradient for a project type (shared by the banner and the small logo). */
export function projectGradient(projectType?: string): string {
  const [from, to] = PALETTES[(projectType || "").toUpperCase()] || FALLBACK;
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** A generated banner for a project: gradient by type + the project's initial. Fills its parent. */
export default function ProjectBanner({ title, projectType }: { title: string; projectType?: string }) {
  const initial = (title || "?").trim().charAt(0).toUpperCase();
  const label = LABELS[(projectType || "").toUpperCase()];

  return (
    <div
      className={styles.banner}
      style={{ background: projectGradient(projectType) }}
      role="img"
      aria-label={`${title}${label ? `, ${label} project` : ""}`}
    >
      <span className={styles.circleLarge} aria-hidden="true" />
      <span className={styles.circleSmall} aria-hidden="true" />
      <span className={styles.initial} aria-hidden="true">{initial}</span>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
