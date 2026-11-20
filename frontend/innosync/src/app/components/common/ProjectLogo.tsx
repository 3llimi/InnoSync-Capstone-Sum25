import React from "react";
import { projectGradient } from "./ProjectBanner";

/** A small rounded-square project mark: type gradient + the project's initial. */
export default function ProjectLogo({
  title,
  projectType,
  size = 48,
  radius,
}: {
  title: string;
  projectType?: string;
  size?: number;
  radius?: number;
}) {
  return (
    <span
      role="img"
      aria-label={`${title} logo`}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size * 0.25),
        background: projectGradient(projectType),
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 700,
        fontSize: Math.round(size * 0.46),
        lineHeight: 1,
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        userSelect: "none",
      }}
    >
      {(title || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}
