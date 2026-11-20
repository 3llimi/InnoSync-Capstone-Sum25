"use client";
import React, { useEffect, useState } from "react";
import styles from "./OverviewPage.module.css";
import { useRouter } from "next/navigation";
import { SkeletonBlock } from "../../common/Skeleton";

type Counts = {
  active: number;
  invitations: number;
  proposals: number;
  joined: number;
};

/** Animates 0 -> value once, unless the visitor prefers reduced motion. */
function useCountUp(target: number | null, durationMs = 700): number | null {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return target === null ? null : value;
}

function StatValue({ value, failed }: { value: number | null; failed: boolean }) {
  const shown = useCountUp(value);
  if (failed) return <span className={styles.statValue} title="Couldn't load this number">-</span>;
  if (shown === null) return <SkeletonBlock width={28} height={20} />;
  return <span className={styles.statValue}>{shown}</span>;
}

const SimpleDashboard = () => {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setFailed(true);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const get = async <T,>(path: string): Promise<T> => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { headers });
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
      return res.json();
    };

    let cancelled = false;
    Promise.all([
      get<unknown[]>("/api/projects/me"),
      get<{ status: string }[]>("/api/invitations/received"),
      get<{ status: string }[]>("/api/applications"),
      get<unknown[]>("/api/projects/joined"),
    ])
      .then(([mine, invitations, applications, joined]) => {
        if (cancelled) return;
        setCounts({
          active: mine.length,
          invitations: invitations.filter((i) => i.status === "INVITED").length,
          proposals: applications.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length,
          joined: joined.length,
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: "Active projects:", value: counts?.active ?? null, route: "/dashboard/projects" },
    { label: "Pending Invitations:", value: counts?.invitations ?? null, route: "/dashboard/invitations" },
    { label: "Open proposals:", value: counts?.proposals ?? null, route: "/dashboard/proposals" },
    { label: "Joined projects:", value: counts?.joined ?? null, route: "/dashboard/projects" },
  ];

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Welcome to your Dashboard</h1>
        <p className={styles.dashboardSubtitle}>
          Here you can manage your projects, invitations, and more.
        </p>
      </div>

      <div className={styles.statsContainer}>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`${styles.statCardNew} rise-in`}
            style={{ cursor: "pointer", ["--i" as string]: index }}
            onClick={() => router.push(stat.route)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(stat.route);
              }
            }}
            role="link"
            tabIndex={0}
          >
            <span className={styles.statLabel}>{stat.label}</span>
            <StatValue value={stat.value} failed={failed} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleDashboard;
