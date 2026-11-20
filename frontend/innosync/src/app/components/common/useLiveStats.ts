"use client";
import { useEffect, useState } from "react";

export type LiveStats = {
  talents: number;
  skills: number;
  roles: number;
  topSkills: string[];
  people: { name: string; position: string }[];
};

// One request shared by every component on the page (landing + about use the same data).
let cache: Promise<LiveStats | null> | null = null;

function load(): Promise<LiveStats | null> {
  if (!cache) {
    cache = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/all`)
      .then((r) => (r.ok ? r.json() : null))
      .then((profiles: { fullName?: string; position?: string; technologies?: string[] }[] | null) => {
        if (!Array.isArray(profiles)) return null;
        const real = profiles.filter((p) => p.position); // skip service accounts without a profile
        const counts = new Map<string, number>();
        real.forEach((p) => (p.technologies || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
        return {
          talents: real.length,
          skills: counts.size,
          roles: new Set(real.map((p) => p.position)).size,
          topSkills: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
          people: real.map((p) => ({ name: p.fullName || "", position: p.position || "" })),
        };
      })
      .catch(() => {
        cache = null; // allow a retry on the next mount (e.g. the API was still waking up)
        return null;
      });
  }
  return cache;
}

/** Public, live platform numbers from the API. `null` until loaded (or if the API is unavailable). */
export default function useLiveStats(): LiveStats | null {
  const [stats, setStats] = useState<LiveStats | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}
