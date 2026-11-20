"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./OverviewPage.module.css";
import Avatar from "../../common/Avatar";
import ProjectLogo from "../../common/ProjectLogo";
import { useCountUp } from "../../common/CountUp";
import { SkeletonBlock, SkeletonCircle, SkeletonGroup } from "../../common/Skeleton";
import { getMyProfile } from "../../common/myProfile";

/* ───────────── API shapes (only the fields used here) ───────────── */
type Project = { id: number; title: string; projectType: string; teamSize: string; createdAt: string };
type Role = { id: number; roleName: string };
type Application = {
  id: number; userFullName: string; roleName: string; projectTitle: string; projectId?: number; status: string;
  appliedAt: string; updatedAt?: string | null;
};
type Invitation = {
  id: number; roleName: string; projectTitle: string; senderName: string; recipientName: string;
  status: string; sentAt: string; respondedAt?: string | null;
};
type Profile = {
  fullName: string; bio?: string; telegram?: string; github?: string; position?: string;
  technologies?: string[]; work_experience?: unknown[]; profilePicture?: string | null; resume?: string | null;
};

type ProjectSummary = Project & { roles: number; applicants: number; members: number };
type Activity = {
  id: string; when: string; person: string; text: React.ReactNode; status: string; href: string;
};

type Data = {
  profile: Profile | null;
  owned: ProjectSummary[];
  joined: number;
  received: Application[];
  invitations: Invitation[];
  sentInvitations: Invitation[];
  proposals: Application[];
};

const TYPE_LABEL: Record<string, string> = {
  FREELANCE: "Freelance", ACADEMIC: "Academic", RESEARCH: "Research", HACKATHON: "Hackathon",
};

const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Pending", tone: "amber" },
  UNDER_REVIEW: { label: "In review", tone: "blue" },
  ACCEPTED: { label: "Accepted", tone: "green" },
  REJECTED: { label: "Declined", tone: "red" },
  DECLINED: { label: "Declined", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "grey" },
  INVITED: { label: "Awaiting reply", tone: "amber" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ───────────── Data loading ───────────── */
async function loadOverview(): Promise<Data> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Please log in to see your dashboard.");
  const headers = { Authorization: `Bearer ${token}` };
  const base = process.env.NEXT_PUBLIC_API_URL;
  const get = async <T,>(path: string, fallback: T): Promise<T> => {
    try {
      const r = await fetch(`${base}${path}`, { headers });
      return r.ok ? await r.json() : fallback;
    } catch {
      return fallback;
    }
  };

  const [profileResult, owned, joined, invitations, sentInvitations, proposals, allReceived] = await Promise.all([
    getMyProfile(), // shared with the navbar / header / profile panel
    get<Project[]>("/api/projects/me", []),
    get<Project[]>("/api/projects/joined", []),
    get<Invitation[]>("/api/invitations/received", []),
    get<Invitation[]>("/api/invitations/sent", []),
    get<Application[]>("/api/applications", []),
    // Every application to my projects in one request (null = older backend without this endpoint).
    get<Application[] | null>("/api/applications/received", null),
  ]);
  const profile = (profileResult.data as Profile | null) ?? null;

  // Per owned project: roles and team size (two requests each, in parallel).
  const perProject = await Promise.all(
    owned.map(async (p) => {
      const [roles, team] = await Promise.all([
        get<Role[]>(`/api/projects/${p.id}/roles`, []),
        get<unknown[]>(`/api/projects/${p.id}/team-members`, []),
      ]);
      const apps = allReceived
        ? allReceived.filter((a) => a.projectId === p.id)
        : (await Promise.all(roles.map((r) => get<Application[]>(`/api/applications/project-roles/${r.id}`, [])))).flat();
      return { summary: { ...p, roles: roles.length, applicants: apps.length, members: team.length }, apps };
    })
  );

  return {
    profile,
    owned: perProject.map((x) => x.summary),
    joined: joined.length,
    received: perProject.flatMap((x) => x.apps),
    invitations,
    sentInvitations,
    proposals,
  };
}

/* ───────────── Small pieces ───────────── */
function StatTile({
  label, value, hint, href, tone, icon, index,
}: {
  label: string; value: number; hint: string; href: string; tone: string; icon: React.ReactNode; index: number;
}) {
  const shown = useCountUp(value);
  return (
    <Link href={href} className={`${styles.tile} ${styles[tone]} rise-in`} style={{ ["--i" as string]: index }}>
      <span className={styles.tileIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <span className={styles.tileValue}>{shown}</span>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileHint}>{hint}</span>
      <span className={styles.tileArrow} aria-hidden="true">→</span>
    </Link>
  );
}

function StrengthRing({ percent }: { percent: number }) {
  const shown = useCountUp(percent, true, 1200) ?? 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.ring} role="img" aria-label={`Profile ${percent}% complete`}>
      <svg viewBox="0 0 100 100" width="112" height="112">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#298217" />
            <stop offset="100%" stopColor="#40ba21" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8f1e5" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} transform="rotate(-90 50 50)"
        />
      </svg>
      <span className={styles.ringValue}>{shown}%</span>
    </div>
  );
}

/* ───────────── Page ───────────── */
const OverviewPage = () => {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    loadOverview().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className={styles.state}>
        <p>{error}</p>
        <button className={styles.retry} onClick={load}>Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <SkeletonGroup label="Loading your overview" className={styles.page}>
        <div className={styles.tiles}>
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height={150} radius={20} />)}
        </div>
        <div className={styles.columns}>
          <div className={styles.panel}>
            <SkeletonBlock width="40%" height={20} />
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 18 }}>
                <SkeletonBlock width={48} height={48} radius={12} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <SkeletonBlock width="60%" height={14} />
                  <SkeletonBlock width="35%" height={10} />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.panel}>
            <SkeletonCircle size={112} />
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  /* Derived numbers */
  const pendingReview = data.received.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;
  const pendingInvites = data.invitations.filter((i) => i.status === "INVITED").length;
  const openProposals = data.proposals.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;

  const p = data.profile;
  const checklist = [
    { label: "Bio", done: !!p?.bio },
    { label: "Position", done: !!p?.position },
    { label: "3+ technologies", done: (p?.technologies?.length ?? 0) >= 3 },
    { label: "Work experience", done: (p?.work_experience?.length ?? 0) > 0 },
    { label: "GitHub & Telegram", done: !!p?.github && !!p?.telegram },
    { label: "Profile photo", done: !!p?.profilePicture },
    { label: "Resume", done: !!p?.resume },
  ];
  const strength = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  /* Activity feed: everything that happened, newest first. */
  const activity: Activity[] = [
    ...data.received.map((a) => ({
      id: `app-${a.id}`, when: a.updatedAt || a.appliedAt, person: a.userFullName, status: a.status,
      href: "/dashboard/applications",
      text: <><b>{a.userFullName}</b> applied for <b>{a.roleName}</b> · {a.projectTitle}</>,
    })),
    ...data.invitations.map((i) => ({
      id: `inv-${i.id}`, when: i.respondedAt || i.sentAt, person: i.senderName, status: i.status,
      href: "/dashboard/invitations",
      text: <><b>{i.senderName}</b> invited you as <b>{i.roleName}</b> · {i.projectTitle}</>,
    })),
    ...data.sentInvitations.map((i) => ({
      id: `sent-${i.id}`, when: i.respondedAt || i.sentAt, person: i.recipientName, status: i.status,
      href: "/dashboard/projects",
      text: i.status === "INVITED"
        ? <>You invited <b>{i.recipientName}</b> as <b>{i.roleName}</b></>
        : <><b>{i.recipientName}</b> {i.status === "ACCEPTED" ? "joined" : "declined"} as <b>{i.roleName}</b> · {i.projectTitle}</>,
    })),
    ...data.proposals.map((a) => ({
      id: `prop-${a.id}`, when: a.updatedAt || a.appliedAt, person: a.projectTitle, status: a.status,
      href: "/dashboard/proposals",
      text: <>Your application for <b>{a.roleName}</b> · {a.projectTitle}</>,
    })),
  ]
    .filter((a) => a.when)
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);

  return (
    <div className={styles.page}>
      {/* ── Stat tiles ── */}
      <div className={styles.tiles}>
        <StatTile
          index={0} tone="green" label="Active projects" value={data.owned.length}
          hint={data.joined ? `+ ${data.joined} joined` : "Projects you own"} href="/dashboard/projects"
          icon={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />}
        />
        <StatTile
          index={1} tone="blue" label="Applicants" value={data.received.length}
          hint={pendingReview ? `${pendingReview} waiting for you` : "All reviewed"} href="/dashboard/applications"
          icon={<><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6M16 11h6" /></>}
        />
        <StatTile
          index={2} tone="amber" label="Invitations" value={pendingInvites}
          hint={`${data.invitations.length} received in total`} href="/dashboard/invitations"
          icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>}
        />
        <StatTile
          index={3} tone="violet" label="Open proposals" value={openProposals}
          hint={`${data.proposals.length} sent in total`} href="/dashboard/proposals"
          icon={<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>}
        />
      </div>

      <div className={styles.columns}>
        {/* ── Left: projects + activity ── */}
        <div className={styles.colMain}>
          <section className={`${styles.panel} rise-in`} style={{ ["--i" as string]: 4 }}>
            <header className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Your projects</h2>
              <Link href="/dashboard/projects" className={styles.panelLink}>View all →</Link>
            </header>
            {data.owned.length === 0 ? (
              <div className={styles.empty}>
                <p>You haven&apos;t created a project yet.</p>
                <Link href="/dashboard/projects?new=1" className={styles.smallBtn}>Create your first project</Link>
              </div>
            ) : (
              <ul className={styles.projectList}>
                {data.owned.map((proj) => {
                  const fill = proj.roles ? Math.min(100, Math.round((proj.members / proj.roles) * 100)) : 0;
                  return (
                    <li key={proj.id}>
                      <button className={styles.projectRow} onClick={() => router.push(`/dashboard/projects/${proj.id}`)}>
                        <ProjectLogo title={proj.title} projectType={proj.projectType} size={48} />
                        <span className={styles.projectInfo}>
                          <span className={styles.projectName}>{proj.title}</span>
                          <span className={styles.projectMeta}>
                            <span className={styles.typeChip}>{TYPE_LABEL[proj.projectType] || proj.projectType}</span>
                            {proj.roles} roles · {proj.applicants} applicant{proj.applicants === 1 ? "" : "s"}
                          </span>
                          <span className={styles.fillBar} aria-label={`Team ${fill}% filled`}>
                            <span className={styles.fillBarInner} style={{ width: `${fill}%` }} />
                          </span>
                        </span>
                        <span className={styles.teamCount}>
                          <span><b>{proj.members}</b>/{proj.roles}</span>
                          <small>team</small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${styles.panel} rise-in`} style={{ ["--i" as string]: 5 }}>
            <header className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                Recent activity <span className={styles.liveDot} aria-hidden="true" />
              </h2>
            </header>
            {activity.length === 0 ? (
              <div className={styles.empty}><p>No activity yet. Invite someone or apply to a project to get started.</p></div>
            ) : (
              <ol className={styles.feed}>
                {activity.map((a, i) => {
                  const s = STATUS[a.status] || { label: a.status, tone: "grey" };
                  return (
                    <li key={a.id} className="rise-in" style={{ ["--i" as string]: 6 + i }}>
                      <Link href={a.href} className={styles.feedItem}>
                        <Avatar name={a.person} size={38} />
                        <span className={styles.feedText}>
                          <span>{a.text}</span>
                          <time className={styles.feedTime} dateTime={a.when}>{timeAgo(a.when)}</time>
                        </span>
                        <span className={`${styles.status} ${styles[`status_${s.tone}`]}`}>{s.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* ── Right: profile strength + quick actions ── */}
        <div className={styles.colSide}>
          <section className={`${styles.panel} ${styles.strength} rise-in`} style={{ ["--i" as string]: 5 }}>
            <h2 className={styles.panelTitle}>Profile strength</h2>
            <div className={styles.strengthBody}>
              <StrengthRing percent={strength} />
              <p className={styles.strengthText}>
                {strength >= 85
                  ? "Looking great! Recruiters can see everything they need."
                  : "A complete profile gets better Quick Sync matches."}
              </p>
            </div>
            <ul className={styles.checklist}>
              {checklist.map((c) => (
                <li key={c.label} className={c.done ? styles.done : ""}>
                  <span className={styles.check} aria-hidden="true">{c.done ? "✓" : ""}</span>
                  {c.label}
                  <span className="sr-only">{c.done ? " (done)" : " (missing)"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${styles.panel} rise-in`} style={{ ["--i" as string]: 6 }}>
            <h2 className={styles.panelTitle}>Quick actions</h2>
            <div className={styles.actions}>
              <Link href="/dashboard/projects/quicksync" className={`${styles.action} ${styles.actionPrimary}`}>
                <span aria-hidden="true">⚡</span>
                <span><b>Run Quick Sync</b><small>Let AI build your team</small></span>
              </Link>
              <Link href="/components/talent" className={styles.action}>
                <span aria-hidden="true">🔍</span>
                <span><b>Find talent</b><small>Browse every profile</small></span>
              </Link>
              <Link href="/components/projects" className={styles.action}>
                <span aria-hidden="true">🧭</span>
                <span><b>Explore projects</b><small>Find a role to apply for</small></span>
              </Link>
              <Link href="/dashboard/projects?new=1" className={styles.action}>
                <span aria-hidden="true">＋</span>
                <span><b>New project</b><small>Describe the roles you need</small></span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
