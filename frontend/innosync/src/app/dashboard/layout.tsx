"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import 'react-toastify/dist/ReactToastify.css';
import ProfilePanel from "../components/dashboard/profile-panel/ProfilePanel";
import { getMyProfile } from "../components/common/myProfile";
import styles from "./layout.module.css";

const ICONS: Record<string, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  projects: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  applications: <><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>,
  invitations: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  proposals: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>,
  chats: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />,
};

const tabs = [
  { id: "overview", label: "Overview", href: "/dashboard/overview" },
  { id: "projects", label: "Projects", href: "/dashboard/projects" },
  { id: "applications", label: "Applications", href: "/dashboard/applications" },
  { id: "invitations", label: "Invitations", href: "/dashboard/invitations" },
  { id: "proposals", label: "Proposals", href: "/dashboard/proposals" },
  { id: "chats", label: "Chats", href: "/dashboard/chats" },
];

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = pathname.split("/")[2] || "overview";

  const [firstName, setFirstName] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Sliding pill: measure the active tab and move a single indicator under it.
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    setNow(new Date()); // client-only, so server and client render the same markup
    getMyProfile().then((r) => {
      const fullName = r.data?.fullName;
      if (fullName) setFirstName(String(fullName).split(" ")[0]);
    });
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeTab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    // Keep the active tab visible when the tab row scrolls sideways (small screens).
    tabRefs.current[activeTab]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    window.addEventListener("resize", measure);
    // Web fonts can change tab widths after they load.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [activeTab]);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Your profile">
        <ProfilePanel />
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.date}>
              {now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : " "}
            </p>
            <h1 className={styles.greeting}>
              {now ? greetingFor(now) : "Welcome"}
              {firstName && <>, <span className={styles.name}>{firstName}</span></>}
              <span className={styles.wave} aria-hidden="true">👋</span>
            </h1>
            <p className={styles.sub}>Here&apos;s what&apos;s happening across your projects and team.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/projects/quicksync" className={styles.ghostBtn}>
              <span aria-hidden="true">⚡</span> Quick Sync
            </Link>
            <Link href="/dashboard/projects?new=1" className={styles.primaryBtn}>
              <span aria-hidden="true">＋</span> New project
            </Link>
          </div>
        </header>

        <nav className={styles.tabsWrap} aria-label="Dashboard sections">
          <div className={styles.tabs}>
            {indicator && (
              <span
                className={styles.indicator}
                style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
                aria-hidden="true"
              />
            )}
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  className={`${styles.tab} ${active ? styles.activeTab : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICONS[tab.id]}
                  </svg>
                  {tab.label}
                  {tab.id === "chats" && <span className={styles.soon}>Soon</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={styles.tabContent}>{children}</div>
      </section>
    </div>
  );
}
