"use client";
import { useEffect, useRef, useState } from "react";

/** Must match the `row-leave` animation length in globals.css. */
const LEAVE_MS = 280;
/** An armed "Click again" button disarms itself after this long. */
const ARM_MS = 4000;

/**
 * Two-click delete for list rows: the first click arms the button ("Click again to confirm"), the
 * second calls `remove`. When the server agrees, the row plays its exit animation before `drop`
 * takes it out of the list.
 *
 *   const del = useConfirmDelete(apiDelete);
 *   <tr className={del.isLeaving(id) ? "row-leave" : ""}>
 *   <button onClick={() => del.request(id, () => setRows(r => r.filter(x => x.id !== id)))}>
 *     {del.armed === id ? "Click again to confirm" : "Delete"}
 */
export default function useConfirmDelete<K extends string | number>(remove: (id: K) => Promise<boolean>) {
  const [armed, setArmed] = useState<K | null>(null);
  const [busy, setBusy] = useState<K | null>(null);
  const [leaving, setLeaving] = useState<Set<K>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (armed == null) return;
    const t = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const request = async (id: K, drop: () => void) => {
    if (busy != null) return;
    if (armed !== id) {
      setArmed(id);
      return;
    }
    setArmed(null);
    setBusy(id);
    const ok = await remove(id);
    setBusy(null);
    if (!ok) return;
    setLeaving((s) => new Set(s).add(id));
    timers.current.push(
      setTimeout(() => {
        drop();
        setLeaving((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }, LEAVE_MS)
    );
  };

  return {
    armed,
    busy,
    isLeaving: (id: K) => leaving.has(id),
    request,
    disarm: () => setArmed(null),
  };
}

/** DELETE `path` on the API with the signed-in user's token. Resolves to the HTTP status (0 = network error). */
export async function apiDelete(path: string): Promise<number> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return 401;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status;
  } catch {
    return 0;
  }
}
