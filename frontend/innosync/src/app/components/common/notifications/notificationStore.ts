"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Live in-app notifications, shared by every component that shows them (bell, toasts, dashboard).
 *
 * One poll for the whole app: GET /api/notifications every POLL_MS while the tab is visible, plus an
 * immediate refresh when the tab regains focus, the user signs in/out, or something dispatches
 * `window.dispatchEvent(new Event("notificationsChanged"))`. Read/dismiss actions update the UI first
 * and then tell the server, so clicks feel instant.
 */

export type NotificationType =
  | "INVITATION_RECEIVED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_DECLINED"
  | "APPLICATION_RECEIVED"
  | "APPLICATION_ACCEPTED"
  | "APPLICATION_REJECTED"
  | "PROJECT_DELETED";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  actorName: string | null;
  projectId: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationState {
  items: AppNotification[];
  unread: number;
  /** First response arrived (or failed): stop showing skeletons. */
  loaded: boolean;
  /** The API has no notifications endpoint (older backend): hide the feature quietly. */
  unsupported: boolean;
  /** Last request failed (offline, server asleep...). */
  error: boolean;
}

const POLL_MS = 20_000;
const API = () => process.env.NEXT_PUBLIC_API_URL;

let state: NotificationState = { items: [], unread: 0, loaded: false, unsupported: false, error: false };
const listeners = new Set<() => void>();
const arrivalListeners = new Set<(fresh: AppNotification[]) => void>();
/** Ids already seen, so only genuinely new rows trigger a toast. Null until the first load. */
let seen: Set<number> | null = null;
let seenFor: string | null = null;
let inFlight: Promise<void> | null = null;

function set(next: Partial<NotificationState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function headers(t: string) {
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

/** Fetch the latest notifications. Concurrent callers share one request. */
export function refreshNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  const t = token();
  if (!t) {
    seen = null;
    seenFor = null;
    set({ items: [], unread: 0, loaded: true, error: false });
    return Promise.resolve();
  }
  if (state.unsupported) return Promise.resolve();

  inFlight = (async () => {
    try {
      const res = await fetch(`${API()}/api/notifications?limit=30`, { headers: headers(t) });
      if (res.status === 404) {
        set({ unsupported: true, loaded: true });
        return;
      }
      if (!res.ok) {
        set({ error: true, loaded: true });
        return;
      }
      const data: { unreadCount: number; items: AppNotification[] } = await res.json();
      if (token() !== t) return; // signed out / switched account meanwhile

      // A different account: start over, so its backlog isn't announced as new.
      if (seenFor !== t) {
        seen = null;
        seenFor = t;
      }
      const fresh = seen ? data.items.filter((n) => !seen!.has(n.id) && !n.read) : [];
      seen = new Set(data.items.map((n) => n.id));

      set({ items: data.items, unread: data.unreadCount, loaded: true, error: false });
      if (fresh.length) arrivalListeners.forEach((l) => l(fresh));
    } catch {
      set({ error: true, loaded: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function send(path: string, method: "PATCH" | "DELETE") {
  const t = token();
  if (!t) return;
  try {
    const res = await fetch(`${API()}${path}`, { method, headers: headers(t) });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    // The optimistic change was wrong: reload the truth from the server.
    refreshNotifications();
  }
}

export function markNotificationRead(id: number) {
  const target = state.items.find((n) => n.id === id);
  if (!target || target.read) return;
  set({
    items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    unread: Math.max(0, state.unread - 1),
  });
  send(`/api/notifications/${id}/read`, "PATCH");
}

export function markAllNotificationsRead() {
  if (!state.unread) return;
  set({ items: state.items.map((n) => ({ ...n, read: true })), unread: 0 });
  send(`/api/notifications/read-all`, "PATCH");
}

export function dismissNotification(id: number) {
  const target = state.items.find((n) => n.id === id);
  if (!target) return;
  set({
    items: state.items.filter((n) => n.id !== id),
    unread: target.read ? state.unread : Math.max(0, state.unread - 1),
  });
  send(`/api/notifications/${id}`, "DELETE");
}

/* ───────────── Polling lifecycle (shared by all subscribers) ───────────── */

let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function onVisible() {
  if (document.visibilityState === "visible") refreshNotifications();
}

function onAuthChange() {
  seen = null;
  seenFor = null;
  set({ items: [], unread: 0, loaded: false, unsupported: false, error: false });
  refreshNotifications();
}

const onChanged = () => {
  refreshNotifications();
};

function start() {
  if (users++ > 0) return;
  refreshNotifications();
  timer = setInterval(() => {
    if (document.visibilityState === "visible") refreshNotifications();
  }, POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onChanged);
  window.addEventListener("notificationsChanged", onChanged);
  window.addEventListener("authStateChanged", onAuthChange);
}

function stop() {
  if (--users > 0) return;
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("focus", onChanged);
  window.removeEventListener("notificationsChanged", onChanged);
  window.removeEventListener("authStateChanged", onAuthChange);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    stop();
  };
}

const serverSnapshot: NotificationState = { items: [], unread: 0, loaded: false, unsupported: false, error: false };

/** Current notifications; keeps the shared poll running while any component uses it. */
export function useNotifications(): NotificationState {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}

/** Called with notifications that arrived since the last poll (never for the initial backlog). */
export function useNotificationArrivals(callback: (fresh: AppNotification[]) => void) {
  useEffect(() => {
    arrivalListeners.add(callback);
    return () => {
      arrivalListeners.delete(callback);
    };
  }, [callback]);
}

/* ───────────── Helpers for display ───────────── */

export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
