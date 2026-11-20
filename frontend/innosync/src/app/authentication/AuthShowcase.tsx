"use client";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import Avatar from "../components/common/Avatar";
import CountUp from "../components/common/CountUp";
import useLiveStats from "../components/common/useLiveStats";

const LINES = [
  "Show what you can do, not just where you studied.",
  "Get matched to projects that need your skills.",
  "Let Quick Sync assemble a balanced team in seconds.",
];

/**
 * Right-hand panel on the login / signup screens: drifting glow, floating "live" cards built from
 * real platform data, and a rotating tagline. Loading the stats also wakes the free-tier API
 * while the person is still typing.
 */
export default function AuthShowcase() {
  const stats = useLiveStats();
  const [line, setLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLine((i) => (i + 1) % LINES.length), 3800);
    return () => clearInterval(t);
  }, []);

  const people = stats?.people.slice(0, 4) ?? [];
  const skills = stats?.topSkills.slice(0, 6) ?? ["React", "Python", "Java", "Figma", "Docker", "SQL"];

  return (
    <aside className={styles.showcase} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blobA}`} />
      <span className={`${styles.blob} ${styles.blobB}`} />
      <span className={styles.dots} />

      <div className={styles.showcaseInner}>
        <span className={styles.showLogo}>Inno<b>Sync</b></span>

        <h2 className={styles.showTitle}>
          Find the team<br />that fits you.
        </h2>
        <p className={styles.showLine} key={line}>{LINES[line]}</p>

        <div className={styles.cards}>
          {/* Match card */}
          <div className={`${styles.glass} ${styles.cardMatch}`}>
            <div className={styles.glassHead}>
              <span className={styles.liveDot} />
              Team match found
            </div>
            <div className={styles.matchPeople}>
              {(people.length ? people : [{ name: "A K" }, { name: "M R" }, { name: "L T" }, { name: "S N" }]).map((p, i) => (
                <span key={i} className={styles.matchAvatar} style={{ ["--i" as string]: i }}>
                  <Avatar name={p.name} size={34} />
                </span>
              ))}
              <span className={styles.matchScore}>
                <b>92%</b> fit
              </span>
            </div>
            <div className={styles.matchBar}><span /></div>
          </div>

          {/* Stats card: only once real numbers have arrived */}
          {stats && (
            <div className={`${styles.glass} ${styles.cardStats}`}>
              <div>
                <CountUp value={stats.talents} className={styles.statNum} />
                <small>talents</small>
              </div>
              <div>
                <CountUp value={stats.skills} className={styles.statNum} />
                <small>skills</small>
              </div>
            </div>
          )}

          {/* Skills card */}
          <div className={`${styles.glass} ${styles.cardSkills}`}>
            {skills.map((s, i) => (
              <span key={s} className={styles.skillChip} style={{ ["--i" as string]: i }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
