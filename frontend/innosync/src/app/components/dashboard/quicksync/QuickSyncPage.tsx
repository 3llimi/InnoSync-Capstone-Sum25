'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from 'react-toastify';
import styles from "./QuickSyncPage.module.css";
import Avatar from "../../common/Avatar";
import ProjectLogo from "../../common/ProjectLogo";
import { SkeletonBlock, SkeletonGroup, SkeletonPerson } from "../../common/Skeleton";
import AnimatedList from "../../common/AnimatedList";
import { getMyProfile } from "../../common/myProfile";

/* ───────────── API shapes ───────────── */

interface ApiMember {
  id: number; // profile id
  bio: string;
  position: string;
  education: string;
  technologies: string[];
  expertise_level: string;
  experience_years: string;
  // Newer ML service: why this person was picked.
  role?: string;
  role_id?: number | null;
  role_match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
}

interface TeamResponse {
  combined_score: number;
  members: ApiMember[];
}

interface Project {
  id: number;
  title: string;
  description: string;
  projectType?: string;
  teamSize?: string;
  createdAt: string;
}

interface Role {
  id: number;
  roleName: string;
  expertiseLevel: string;
  technologies: string[];
}

interface Profile {
  id: number;
  user_id?: number;
  fullName: string;
  email: string;
  profilePicture: string | null;
}

interface SentInvitation {
  projectRoleId: number;
  recipientId: number;
  status: string;
}

/* ───────────── UI shapes ───────────── */

interface Candidate {
  id: number;            // profile id (what the ML service uses)
  userId: number | null; // account id (what invitations need)
  name: string;
  avatar: string | null;
  position: string;
  level: string;
  education: string;
  experience: string;
  bio: string;
  skills: string[];
  match: number | null;  // 0..1 skill match against the role
}

interface Slot {
  role: Role;
  candidate: Candidate | null;
}

/* ───────────── Helpers ───────────── */

const API = process.env.NEXT_PUBLIC_API_URL;
const ML = process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000';

const LEVEL: Record<string, string> = { ENTRY: 'Entry', JUNIOR: 'Junior', MID: 'Mid', SENIOR: 'Senior', RESEARCHER: 'Researcher' };
const EDUCATION: Record<string, string> = { NO_DEGREE: 'No degree', BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'PhD' };
const EXPERIENCE: Record<string, string> = {
  ZERO_TO_ONE: '< 1 year', ONE_TO_THREE: '1–3 years', THREE_TO_FIVE: '3–5 years',
  FIVE_TO_SEVEN: '5–7 years', SEVEN_TO_TEN: '7–10 years', MORE_THAN_TEN: '10+ years',
};
const TYPE: Record<string, string> = { FREELANCE: 'Freelance', ACADEMIC: 'Academic', RESEARCH: 'Research', HACKATHON: 'Hackathon' };
const SIZE: Record<string, string> = { OneThree: '1–3 people', FourSix: '4–6 people', SevenPlus: '7+ people' };

/** Seniority order for sorting (higher = more senior). */
const LEVEL_RANK: Record<string, number> = { Entry: 1, Junior: 2, Mid: 3, Senior: 4, Researcher: 5 };

type SortId = 'role' | 'match' | 'seniority';
const SORTS: { id: SortId; label: string }[] = [
  { id: 'role', label: 'Role order' },
  { id: 'match', label: 'Best match' },
  { id: 'seniority', label: 'Most senior' },
];

const pct = (v: number | null | undefined) => (v == null ? null : Math.round(Math.max(0, Math.min(1, v)) * 100));
const randomSeed = () => 1 + Math.floor(Math.random() * 1_000_000);
const lower = (xs: string[]) => new Set(xs.map((x) => x.toLowerCase()));

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`, 'Content-Type': 'application/json' };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Put each recommended member into the slot of the role they were picked for. */
function buildSlots(roles: Role[], members: ApiMember[], toCandidate: (m: ApiMember, role: Role) => Candidate): Slot[] {
  const unused = [...members];
  return roles.map((role) => {
    // Newer ML responses name the exact role id; older ones only give the position.
    let i = unused.findIndex((m) => m.role_id === role.id);
    if (i < 0) i = unused.findIndex((m) => m.role_id == null && (m.role ?? m.position) === role.roleName);
    const member = i >= 0 ? unused.splice(i, 1)[0] : null;
    return { role, candidate: member ? toCandidate(member, role) : null };
  });
}

/* ───────────── Page ───────────── */

export default function QuickSyncPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teamScore, setTeamScore] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [loadingTeam, setLoadingTeam] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<'all' | number | null>(null); // 'all' or a role id
  const [freshRoleIds, setFreshRoleIds] = useState<Set<number>>(new Set());
  const [inviting, setInviting] = useState<number | null>(null); // role id
  const [invited, setInvited] = useState<Set<string>>(new Set()); // `${roleId}:${userId}`
  const [sortBy, setSortBy] = useState<SortId>('role');

  const profilesRef = useRef<Profile[]>([]);
  // The recruiter's own profile is never suggested (and can't be invited) for their own project.
  const myProfileId = useRef<number | null>(null);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const requestId = useRef(0);

  const project = projects?.find((p) => p.id === projectId) ?? null;

  const toCandidate = useCallback((m: ApiMember, role: Role): Candidate => {
    const profile = profilesRef.current.find((p) => p.id === m.id);
    const roleSkills = lower(role.technologies);
    // Older ML responses carry no score: estimate it from the share of required skills they have.
    const fallbackMatch = role.technologies.length
      ? m.technologies.filter((t) => roleSkills.has(t.toLowerCase())).length / role.technologies.length
      : null;
    return {
      id: m.id,
      userId: profile?.user_id ?? null,
      name: profile?.fullName || `Talent #${m.id}`,
      avatar: profile?.profilePicture ? `${API}/api/profile/${m.id}/picture` : null,
      position: m.position,
      level: LEVEL[m.expertise_level] ?? m.expertise_level ?? '—',
      education: EDUCATION[m.education] ?? m.education ?? '—',
      experience: EXPERIENCE[m.experience_years] ?? '—',
      bio: m.bio,
      skills: m.technologies ?? [],
      // Older ML versions always send role_match_score 0.0; only trust it alongside matched_skills.
      match: m.matched_skills ? (m.role_match_score ?? fallbackMatch) : fallbackMatch,
    };
  }, []);

  // Ask the ML service for a team. Returns null when no team could be formed (HTTP 400).
  const requestTeam = useCallback(async (
    pid: number,
    extra: { seed?: number; exclude_ids?: number[]; keep_ids?: number[] } = {}
  ): Promise<TeamResponse | null> => {
    const self = myProfileId.current;
    const exclude = [...(extra.exclude_ids ?? []), ...(self != null ? [self] : [])];
    const res = await fetch(`${ML}/recommend-team`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ project_id: pid, ...extra, ...(exclude.length ? { exclude_ids: exclude } : {}) }),
    });
    if (res.status === 400) return null;
    if (!res.ok) throw new Error(`The matching service answered ${res.status}`);
    return res.json();
  }, []);

  /* ── Initial load: projects, profiles, my sent invitations ── */
  useEffect(() => {
    (async () => {
      try {
        const [mine, profiles, sent, me] = await Promise.all([
          getJson<Project[]>(`${API}/api/projects/me`),
          fetch(`${API}/api/profile/all`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          getJson<SentInvitation[]>(`${API}/api/invitations/sent`).catch(() => [] as SentInvitation[]),
          getMyProfile(),
        ]);
        profilesRef.current = profiles;
        if (me.ok && me.data) {
          myProfileId.current = Number(me.data.id) || null;
          setMyUserId(Number(me.data.user_id) || null);
        }
        setInvited(new Set(sent.map((i) => `${i.projectRoleId}:${i.recipientId}`)));
        const sorted = [...mine].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(sorted);
        // ?project=<id> (e.g. right after creating a project), otherwise the newest one.
        const wanted = Number(new URLSearchParams(window.location.search).get('project'));
        setProjectId(sorted.find((p) => p.id === wanted)?.id ?? sorted[0]?.id ?? null);
        if (!sorted.length) setLoadingTeam(false);
      } catch (e) {
        setError((e as Error).message);
        setLoadingTeam(false);
      }
    })();
  }, []);

  /* ── Load roles + recommended team whenever the project changes ── */
  const loadTeam = useCallback(async (pid: number) => {
    const id = ++requestId.current;
    setLoadingTeam(true);
    setError(null);
    setSlots([]);
    setTeamScore(null);
    try {
      const projectRoles = await getJson<Role[]>(`${API}/api/projects/${pid}/roles`);
      if (id !== requestId.current) return;
      setRoles(projectRoles);
      if (!projectRoles.length) {
        setLoadingTeam(false);
        return;
      }
      const team = await requestTeam(pid);
      if (id !== requestId.current) return;
      const next = buildSlots(projectRoles, team?.members ?? [], toCandidate);
      setSlots(next);
      setTeamScore(team?.combined_score ?? null);
      setSelectedRoleId(next.find((s) => s.candidate)?.role.id ?? projectRoles[0].id);
      setFreshRoleIds(new Set());
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoadingTeam(false);
    }
  }, [requestTeam, toCandidate]);

  useEffect(() => {
    if (projectId != null) loadTeam(projectId);
  }, [projectId, loadTeam]);

  // The free-tier ML service can take up to a minute to wake: say so instead of looking frozen.
  useEffect(() => {
    if (!loadingTeam) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [loadingTeam]);

  const changeProject = (pid: number) => {
    setProjectId(pid);
    const url = new URL(window.location.href);
    url.searchParams.set('project', String(pid));
    window.history.replaceState(null, '', url);
  };

  /* ── Reroll ── */
  const filled = slots.filter((s) => s.candidate);

  const rerollAll = async () => {
    if (projectId == null || rerolling) return;
    setRerolling('all');
    try {
      const current = filled.map((s) => s.candidate!.id);
      const team = await requestTeam(projectId, { seed: randomSeed(), exclude_ids: current });
      const next = buildSlots(roles, team?.members ?? [], toCandidate);
      const changed = next.filter((s, i) => s.candidate && s.candidate.id !== slots[i]?.candidate?.id);
      if (!team || changed.length === 0) {
        toast.info('No other combination fits these roles right now. Add more talents or roles to see alternatives.');
        return;
      }
      setSlots(next);
      setTeamScore(team.combined_score);
      setFreshRoleIds(new Set(changed.map((s) => s.role.id)));
      toast.success(changed.length === filled.length ? 'New team suggested.' : `${changed.length} of ${filled.length} roles got a new suggestion.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRerolling(null);
    }
  };

  const rerollSlot = async (slot: Slot) => {
    if (projectId == null || rerolling || !slot.candidate) return;
    setRerolling(slot.role.id);
    setSelectedRoleId(slot.role.id);
    try {
      const keep = filled.filter((s) => s !== slot).map((s) => s.candidate!.id);
      const team = await requestTeam(projectId, { seed: randomSeed(), exclude_ids: [slot.candidate.id], keep_ids: keep });
      const replacement =
        team?.members.find((m) => m.role_id === slot.role.id) ??
        team?.members.find((m) => !keep.includes(m.id) && (m.role ?? m.position) === slot.role.roleName);
      if (!replacement || replacement.id === slot.candidate.id) {
        toast.info(`${slot.candidate.name} is the only ${slot.role.roleName} available right now.`);
        return;
      }
      const newcomer = toCandidate(replacement, slot.role);
      setSlots((list) => list.map((s) => (s.role.id === slot.role.id ? { ...s, candidate: newcomer } : s)));
      setFreshRoleIds(new Set([slot.role.id]));
      if (team) setTeamScore(team.combined_score);
      toast.success(`${newcomer.name} suggested for ${slot.role.roleName}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRerolling(null);
    }
  };

  /* ── Invite ── */
  const invite = async (slot: Slot) => {
    const c = slot.candidate;
    if (!c) return;
    if (c.userId == null) {
      toast.error("Couldn't find this person's account. Please refresh and try again.");
      return;
    }
    if (c.userId === myUserId) {
      toast.info("That's you. You can't invite yourself to your own project.");
      return;
    }
    setInviting(slot.role.id);
    try {
      const res = await fetch(`${API}/api/invitations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ projectRoleId: slot.role.id, recipientId: c.userId }),
      });
      const key = `${slot.role.id}:${c.userId}`;
      if (res.status === 409) {
        setInvited((s) => new Set(s).add(key));
        toast.info(`${c.name} already has an invitation for ${slot.role.roleName}.`);
        return;
      }
      if (res.status === 400) {
        toast.error("You can't invite yourself.");
        return;
      }
      if (!res.ok) throw new Error(`Invitation failed (${res.status})`);
      setInvited((s) => new Set(s).add(key));
      toast.success(`Invitation sent to ${c.name} for ${slot.role.roleName}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInviting(null);
    }
  };

  /* ── Derived numbers for the header ── */
  const stats = useMemo(() => {
    const matches = filled.map((s) => s.candidate!.match).filter((m): m is number => m != null);
    return {
      filled: filled.length,
      total: slots.length || roles.length,
      avgMatch: matches.length ? pct(matches.reduce((a, b) => a + b, 0) / matches.length) : null,
      fit: pct(teamScore),
    };
  }, [filled, slots.length, roles.length, teamScore]);

  const selected = slots.find((s) => s.role.id === selectedRoleId) ?? null;

  // Display order. Empty roles always go last when sorting by a person's qualities.
  const sortedSlots = useMemo(() => {
    if (sortBy === 'role') return slots;
    const score = (s: Slot) =>
      sortBy === 'match'
        ? s.candidate?.match ?? -1
        : s.candidate ? LEVEL_RANK[s.candidate.level] ?? 0 : -1;
    return [...slots].sort((a, b) => score(b) - score(a) || (b.candidate?.match ?? 0) - (a.candidate?.match ?? 0));
  }, [slots, sortBy]);

  /* ───────────── Render ───────────── */

  if (projects && projects.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">⚡</span>
          <h2>Create a project to use Quick Sync</h2>
          <p>Quick Sync recommends a team for the roles of one of your projects. Add a project with its roles first.</p>
          <Link href="/dashboard/projects?new=1" className={styles.primaryBtn}>+ New project</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header: which project, how good the team is, reroll everything ── */}
      <header className={styles.header}>
        <div className={styles.headMain}>
          {project ? (
            <ProjectLogo title={project.title} projectType={project.projectType} size={56} radius={16} />
          ) : (
            <SkeletonBlock width={56} height={56} radius={16} />
          )}
          <div className={styles.headText}>
            <span className={styles.kicker}>⚡ Quick Sync · recommended team for</span>
            <ProjectPicker
              projects={projects ?? []}
              value={projectId}
              onChange={changeProject}
              disabled={!projects || loadingTeam || !!rerolling}
            />
            {project && (
              <div className={styles.projectMeta}>
                {project.projectType && <span>{TYPE[project.projectType] ?? project.projectType}</span>}
                {project.teamSize && <span>{SIZE[project.teamSize] ?? project.teamSize}</span>}
                <span>{roles.length} {roles.length === 1 ? 'role' : 'roles'}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.headSide}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <b>{loadingTeam ? '–' : stats.fit != null ? `${stats.fit}%` : '–'}</b>
              <small>Team fit</small>
            </div>
            <div className={styles.stat}>
              <b>{loadingTeam ? '–' : `${stats.filled}/${stats.total}`}</b>
              <small>Roles filled</small>
            </div>
            <div className={styles.stat}>
              <b>{loadingTeam ? '–' : stats.avgMatch != null ? `${stats.avgMatch}%` : '–'}</b>
              <small>Avg. skill match</small>
            </div>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={rerollAll}
            disabled={loadingTeam || !!rerolling || filled.length === 0}
            aria-busy={rerolling === 'all'}
          >
            <RerollIcon spinning={rerolling === 'all'} />
            {rerolling === 'all' ? 'Finding a new team…' : 'Reroll team'}
          </button>
        </div>
      </header>

      <div className={styles.toolbar}>
        <p className={styles.howto}>
          Each role gets the talent whose skills and level fit it best, chosen so the team works well together.
          Use <b>Reroll</b> on a role to see someone else, or <b>Reroll team</b> for a different combination.
        </p>
        <div className={styles.sortGroup} role="radiogroup" aria-label="Sort roles">
          <span className={styles.sortLabel}>Sort</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={sortBy === s.id}
              className={`${styles.sortBtn} ${sortBy === s.id ? styles.sortActive : ''}`}
              onClick={() => setSortBy(s.id)}
              disabled={loadingTeam || slots.length < 2}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>Couldn&apos;t load recommendations: {error}</p>
          <button type="button" className={styles.ghostBtn} onClick={() => projectId != null && loadTeam(projectId)}>Try again</button>
        </div>
      ) : (
        <div className={styles.body}>
          {/* ── One card per role ── */}
          <section className={styles.slots} aria-label="Recommended team by role">
            {loadingTeam ? (
              <SkeletonGroup label="Finding your best team">
                {slow && (
                  <p className={styles.slowHint} role="status">
                    <span className="spinner" aria-hidden="true" /> Waking up the matching service. The first request can take up to a minute.
                  </p>
                )}
                {[0, 1, 2].map((i) => <SkeletonPerson key={i} index={i} />)}
              </SkeletonGroup>
            ) : roles.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>This project has no roles yet</h2>
                <p>Quick Sync fills roles. Add the positions you need to this project, then come back.</p>
                <Link href={`/dashboard/projects/${projectId}`} className={styles.ghostBtn}>Open project</Link>
              </div>
            ) : (
              // AnimatedList glides the cards into their new places when the sort changes.
              <AnimatedList className={styles.slotList} appear={false}>
                {sortedSlots.map((slot, i) => (
                  <RoleCard
                    key={slot.role.id}
                    slot={slot}
                    index={i}
                    selected={slot.role.id === selectedRoleId}
                    fresh={freshRoleIds.has(slot.role.id)}
                    busy={rerolling === slot.role.id || rerolling === 'all'}
                    rerollDisabled={!!rerolling}
                    inviting={inviting === slot.role.id}
                    invited={!!slot.candidate?.userId && invited.has(`${slot.role.id}:${slot.candidate.userId}`)}
                    isMe={myUserId != null && slot.candidate?.userId === myUserId}
                    onSelect={() => setSelectedRoleId(slot.role.id)}
                    onReroll={() => rerollSlot(slot)}
                    onInvite={() => invite(slot)}
                  />
                ))}
              </AnimatedList>
            )}
          </section>

          {/* ── Details of the selected recommendation ── */}
          {!loadingTeam && selected?.candidate && (
            <aside className={styles.details} key={`${selected.role.id}-${selected.candidate.id}`} aria-label="Selected talent">
              <div className={styles.detailsHead}>
                <Avatar name={selected.candidate.name} src={selected.candidate.avatar} size={72} />
                <div>
                  <h3>{selected.candidate.name}</h3>
                  <span className={styles.positionChip}>{selected.candidate.position}</span>
                </div>
              </div>
              <p className={styles.why}>
                Recommended as <b>{selected.role.roleName}</b> for <b>{project?.title}</b>
                {selected.candidate.match != null && <> · {pct(selected.candidate.match)}% skill match</>}
              </p>
              <div className={styles.facts}>
                <div><small>Level</small><b>{selected.candidate.level}</b></div>
                <div><small>Education</small><b>{selected.candidate.education}</b></div>
                <div><small>Experience</small><b>{selected.candidate.experience}</b></div>
              </div>
              <h4>Skills</h4>
              <div className={styles.skillList}>
                {selected.candidate.skills.map((s) => (
                  <span key={s} className={lower(selected.role.technologies).has(s.toLowerCase()) ? styles.skillHit : styles.skill}>{s}</span>
                ))}
              </div>
              <p className={styles.legend}><span className={styles.skillHit}>Green</span> = required by this role</p>
              {selected.candidate.bio && (
                <>
                  <h4>About</h4>
                  <p className={styles.bio}>{selected.candidate.bio}</p>
                </>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── Role card ───────────── */

function RoleCard({
  slot, index, selected, fresh, busy, rerollDisabled, inviting, invited, isMe, onSelect, onReroll, onInvite,
}: {
  slot: Slot; index: number; selected: boolean; fresh: boolean; busy: boolean; rerollDisabled: boolean;
  inviting: boolean; invited: boolean; isMe: boolean; onSelect: () => void; onReroll: () => void; onInvite: () => void;
}) {
  const { role, candidate } = slot;
  const has = candidate ? lower(candidate.skills) : new Set<string>();
  const match = candidate ? pct(candidate.match) : null;

  return (
    <article
      className={`${styles.roleCard} rise-in ${selected ? styles.roleSelected : ''} ${fresh ? styles.fresh : ''} ${busy ? styles.busy : ''}`}
      style={{ ['--i' as string]: Math.min(index, 10) }}
      aria-label={`${role.roleName}${candidate ? `: ${candidate.name}` : ': no match'}`}
    >
      {/* Role being filled */}
      <div className={styles.roleHead}>
        <span className={styles.roleName}>{role.roleName}</span>
        <span className={styles.roleLevel}>{LEVEL[role.expertiseLevel] ?? role.expertiseLevel}</span>
      </div>
      {role.technologies.length > 0 && (
        <div className={styles.needs}>
          <small>Needs</small>
          {role.technologies.map((t) => (
            <span key={t} className={candidate && has.has(t.toLowerCase()) ? styles.needHit : styles.needMiss}>
              {candidate && has.has(t.toLowerCase()) && <span aria-hidden="true">✓ </span>}{t}
            </span>
          ))}
        </div>
      )}

      {candidate ? (
        <div className={styles.match}>
          <button type="button" className={styles.person} onClick={onSelect} aria-pressed={selected}>
            <Avatar name={candidate.name} src={candidate.avatar} size={52} />
            <span className={styles.personText}>
              <b>{candidate.name}{isMe && <span className={styles.youTag}>You</span>}</b>
              <small>{candidate.level} · {candidate.education} · {candidate.experience}</small>
            </span>
          </button>

          {match != null && (
            <div className={styles.score} title="How closely their skills match this role's requirements">
              <div className={styles.scoreBar}><span style={{ width: `${match}%` }} /></div>
              <small>{match}% skill match</small>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={onReroll} disabled={rerollDisabled} aria-busy={busy}
              aria-label={`Suggest someone else for ${role.roleName}`}>
              <RerollIcon spinning={busy} />
              {busy ? 'Finding…' : 'Reroll'}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={onInvite} disabled={inviting || invited || isMe}
              title={isMe ? "You can't invite yourself" : undefined}>
              {isMe ? "That's you" : invited ? 'Invited ✓' : inviting ? 'Sending…' : 'Invite'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.noMatch}>
          No talent with the position <b>{role.roleName}</b> yet. They&apos;ll appear here once someone with that position joins.
        </div>
      )}
    </article>
  );
}

/* ───────────── Project picker ───────────── */

/** The project title doubles as a dropdown to switch projects. Keyboard: ↑ ↓ Home End Enter Esc. */
function ProjectPicker({
  projects, value, onChange, disabled,
}: {
  projects: Project[]; value: number | null; onChange: (id: number) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = projects.find((p) => p.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, projects.findIndex((p) => p.id === value)));
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    requestAnimationFrame(() => listRef.current?.focus());
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, projects, value]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (id: number) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (id !== value) onChange(id);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(projects.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(projects.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (projects[active]) choose(projects[active].id); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); buttonRef.current?.focus(); }
  };

  return (
    <div className={styles.picker} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.pickerButton} ${open ? styles.pickerOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); }
        }}
        disabled={disabled || projects.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Project: ${current?.title ?? 'none'}. Change project`}
      >
        <span className={styles.pickerTitle}>{current?.title ?? 'Loading…'}</span>
        {projects.length > 1 && (
          <span className={styles.pickerCount}>{projects.length} projects</span>
        )}
        <svg className={styles.pickerChevron} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          className={styles.pickerMenu}
          role="listbox"
          tabIndex={-1}
          aria-label="Your projects"
          aria-activedescendant={projects[active] ? `qs-project-${projects[active].id}` : undefined}
          onKeyDown={onListKey}
        >
          {projects.map((p, i) => {
            const isCurrent = p.id === value;
            return (
              <li
                key={p.id}
                id={`qs-project-${p.id}`}
                role="option"
                aria-selected={isCurrent}
                className={`${styles.pickerOption} ${i === active ? styles.pickerActive : ''} ${isCurrent ? styles.pickerCurrent : ''}`}
                style={{ ['--i' as string]: Math.min(i, 8) }}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p.id)}
              >
                <ProjectLogo title={p.title} projectType={p.projectType} size={36} radius={10} />
                <span className={styles.pickerText}>
                  <b>{p.title}</b>
                  <small>
                    {[p.projectType && (TYPE[p.projectType] ?? p.projectType), p.teamSize && (SIZE[p.teamSize] ?? p.teamSize)]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
                {isCurrent && (
                  <svg className={styles.pickerCheck} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RerollIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={spinning ? styles.spin : undefined} viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
