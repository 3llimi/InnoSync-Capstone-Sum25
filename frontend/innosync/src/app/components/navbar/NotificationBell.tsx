"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./NotificationBell.module.css";
import {
  AppNotification,
  NotificationType,
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotifications,
  timeAgo,
  useNotificationArrivals,
  useNotifications,
} from "../common/notifications/notificationStore";

/** Must match the `panel-out` animation length in NotificationBell.module.css. */
const CLOSE_MS = 170;
const TOAST_LIMIT = 3;

type Tone = "green" | "blue" | "amber" | "red" | "grey";

const KIND: Record<NotificationType, { tone: Tone; icon: React.ReactNode }> = {
  INVITATION_RECEIVED: { tone: "green", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
  INVITATION_ACCEPTED: { tone: "green", icon: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4M16 18l2 2 4-4" /></> },
  INVITATION_DECLINED: { tone: "amber", icon: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7 1.6 0 3 .5 4.2 1.4M17 16l4 4M21 16l-4 4" /></> },
  APPLICATION_RECEIVED: { tone: "blue", icon: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></> },
  APPLICATION_ACCEPTED: { tone: "green", icon: <><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" /></> },
  APPLICATION_REJECTED: { tone: "grey", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
  PROJECT_DELETED: { tone: "red", icon: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></> },
};

const FALLBACK = { tone: "grey" as Tone, icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></> };

function KindIcon({ type, size = 18 }: { type: NotificationType; size?: number }) {
  const kind = KIND[type] ?? FALLBACK;
  return (
    <span className={`${styles.kindIcon} ${styles[`tone_${kind.tone}`]}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {kind.icon}
      </svg>
    </span>
  );
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const TOAST_MS = 6000;

/** Pop-up for a notification that just arrived. Closes by itself; hovering keeps it open. */
function ToastItem({ n, onOpen, onClose }: { n: AppNotification; onOpen: () => void; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(TOAST_MS);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const t = setTimeout(() => closeRef.current(), left.current);
    return () => {
      clearTimeout(t);
      left.current -= Date.now() - started;
    };
  }, [paused]);

  return (
    <div
      className={`${styles.toast} ${paused ? styles.toastPaused : ""}`}
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ ["--toast-ms" as string]: `${TOAST_MS}ms` }}
    >
      <button type="button" className={styles.toastMain} onClick={onOpen}>
        <KindIcon type={n.type} size={18} />
        <span className={styles.toastText}>
          <small>New notification</small>
          <b>{n.title}</b>
          {n.message && <span>{n.message}</span>}
        </span>
      </button>
      <button type="button" className={styles.toastClose} onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <span className={styles.toastTimer} aria-hidden="true" />
    </div>
  );
}

interface Toast {
  key: string;
  n: AppNotification;
}

export default function NotificationBell() {
  const router = useRouter();
  const { items, unread, loaded, unsupported, error } = useNotifications();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // panel stays mounted while it animates out
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [ring, setRing] = useState(0); // bumps to replay the ring animation
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, setTick] = useState(0); // re-render "5 min ago" labels
  const [portalReady, setPortalReady] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPortalReady(true), []);

  /* ── open / close with exit animation ── */
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    refreshNotifications(); // opening always shows the latest
    setToasts([]); // the panel shows them now; toasts would only cover it
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const tick = setInterval(() => setTick((x) => x + 1), 30_000);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      clearInterval(tick);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* ── new notifications: ring the bell and show a toast ── */
  const onArrival = useCallback((fresh: AppNotification[]) => {
    setRing((r) => r + 1);
    setToasts((list) =>
      [...fresh.slice(0, TOAST_LIMIT).map((n) => ({ key: `${n.id}-${Date.now()}`, n })), ...list].slice(0, TOAST_LIMIT)
    );
  }, []);
  useNotificationArrivals(onArrival);

  const closeToast = (key: string) => setToasts((list) => list.filter((t) => t.key !== key));

  const openNotification = (n: AppNotification) => {
    markNotificationRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  if (unsupported) return null;

  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;
  const today = shown.filter((n) => isToday(n.createdAt));
  const earlier = shown.filter((n) => !isToday(n.createdAt));
  const badge = unread > 99 ? "99+" : String(unread);

  const renderItem = (n: AppNotification, i: number) => (
    <li key={n.id} className={`${styles.item} ${n.read ? "" : styles.itemUnread}`} style={{ ["--i" as string]: i }}>
      <button type="button" className={styles.itemMain} onClick={() => openNotification(n)}>
        <KindIcon type={n.type} />
        <span className={styles.itemText}>
          <span className={styles.itemTitle}>{n.title}</span>
          {n.message && <span className={styles.itemMessage}>{n.message}</span>}
          <span className={styles.itemTime}>
            {timeAgo(n.createdAt)}
            {n.link && <span className={styles.itemOpen}>Open →</span>}
          </span>
        </span>
        {!n.read && <span className={styles.unreadDot} aria-label="Unread" />}
      </button>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => dismissNotification(n.id)}
        aria-label={`Dismiss: ${n.title}`}
        title="Dismiss"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </li>
  );

  let index = 0;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        ref={buttonRef}
        className={`${styles.bell} ${open ? styles.bellOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <svg key={`ring-${ring}`} className={`${styles.bellGlyph} ${ring ? styles.bellRing : ""}`} viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span key={`badge-${badge}`} className={styles.badge} aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {mounted && (
        <div
          ref={panelRef}
          className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClose}`}
          role="dialog"
          aria-label="Notifications"
        >
          <div className={styles.head}>
            <div className={styles.headTitle}>
              <h2>Notifications</h2>
              <span className={`${styles.live} ${error ? styles.liveOff : ""}`} title={error ? "Can't reach the server, retrying" : "Updates automatically"}>
                <i aria-hidden="true" />
                {error ? "Offline" : "Live"}
              </span>
            </div>
            <button type="button" className={styles.markAll} onClick={markAllNotificationsRead} disabled={!unread}>
              Mark all read
            </button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Show">
            {(["all", "unread"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "all" ? "All" : "Unread"}
                {t === "unread" && unread > 0 && <span className={styles.tabCount}>{badge}</span>}
              </button>
            ))}
            <span className={styles.tabGlider} style={{ translate: tab === "all" ? "0 0" : "100% 0" }} aria-hidden="true" />
          </div>

          <div className={styles.body}>
            {!loaded ? (
              <ul className={styles.list} aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className={styles.skelRow}>
                    <span className="skeleton" style={{ width: 38, height: 38, borderRadius: 12 }} />
                    <span style={{ flex: 1, display: "grid", gap: 6 }}>
                      <span className="skeleton" style={{ height: 13, width: "80%" }} />
                      <span className="skeleton" style={{ height: 11, width: "55%" }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : shown.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyArt} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></svg>
                </span>
                <b>{tab === "unread" ? "You're all caught up" : "No notifications yet"}</b>
                <small>
                  {tab === "unread"
                    ? "New invitations and replies will show up here."
                    : "Invitations, applications and replies to them will appear here as they happen."}
                </small>
              </div>
            ) : (
              <>
                {today.length > 0 && (
                  <>
                    <div className={styles.group}>Today</div>
                    <ul className={styles.list}>{today.map((n) => renderItem(n, index++))}</ul>
                  </>
                )}
                {earlier.length > 0 && (
                  <>
                    <div className={styles.group}>Earlier</div>
                    <ul className={styles.list}>{earlier.map((n) => renderItem(n, index++))}</ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {portalReady &&
        createPortal(
          <div className={styles.toasts} aria-live="polite">
            {toasts.map(({ key, n }) => (
              <ToastItem
                key={key}
                n={n}
                onOpen={() => {
                  closeToast(key);
                  openNotification(n);
                }}
                onClose={() => closeToast(key)}
              />
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
