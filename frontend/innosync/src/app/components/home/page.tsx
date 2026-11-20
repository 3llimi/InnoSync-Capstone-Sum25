"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Reveal from "../common/Reveal";
import CountUp from "../common/CountUp";
import Avatar from "../common/Avatar";
import useLiveStats from "../common/useLiveStats";

const ROTATING_WORDS = ["Work", "Build", "Learn", "Ship"];

// Shown in the ticker until (or if) live skills arrive from the API.
const FALLBACK_SKILLS = [
  "React", "TypeScript", "Java", "Spring Boot", "Python", "PyTorch", "Figma", "Docker",
  "Kubernetes", "PostgreSQL", "Flutter", "Swift", "FastAPI", "AWS", "Node.js", "Next.js",
];

const FEATURES = [
  {
    title: "Quick Sync AI",
    text: "Describe the roles you need and get a ranked team in seconds, scored on skills, seniority and how well people work together.",
    icon: (
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    ),
  },
  {
    title: "Talent discovery",
    text: "Filter by experience, education, level and exact skills to find people who already know your stack.",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    title: "Invites & applications",
    text: "Invite people to a role or let them apply. Accept with one click and they join your team automatically.",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  {
    title: "Project workspace",
    text: "Every project gets its own page with roles, team members and progress, so nothing gets lost in chat.",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
];

const STEPS = [
  { title: "Create your profile", text: "Add your skills, level and experience once. It powers every match." },
  { title: "Post a project or browse", text: "Recruiters describe the roles; talent explores open projects." },
  { title: "Sync and build", text: "Quick Sync proposes the team. Invite, accept and start building." },
];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ROTATING_WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={styles.rotator} aria-live="off">
      {/* Keeps the line width stable while words swap. */}
      <span className={styles.rotatorSizer} aria-hidden="true">Learn</span>
      <span key={ROTATING_WORDS[i]} className={styles.rotatorWord}>
        {ROTATING_WORDS[i]}
      </span>
    </span>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const HomePage = () => {
  const router = useRouter();
  const stats = useLiveStats();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
  }, []);

  const handleGetStarted = () => {
    router.push(loggedIn ? "/components/projects" : "/authentication/signup");
  };

  const people = stats?.people ?? [];
  const featured = people.slice(1, 4); // a few real profiles for the floating "match" card
  const skills = stats?.topSkills.length ? stats.topSkills : FALLBACK_SKILLS;
  const half = Math.ceil(skills.length / 2);
  const rowA = skills.slice(0, half);
  const rowB = skills.slice(half).length ? skills.slice(half) : skills;

  return (
    <div className={`scroll-page ${styles.page}`}>
      {/* ───────────── Hero ───────────── */}
      <section className={styles.hero}>
        <div className={styles.blobs} aria-hidden="true">
          <span className={`${styles.blob} ${styles.blobA}`} />
          <span className={`${styles.blob} ${styles.blobB}`} />
          <span className={`${styles.blob} ${styles.blobC}`} />
          <span className={styles.grid} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <span className={`${styles.eyebrow} ${styles.enter}`} style={{ ["--d" as string]: "0ms" }}>
              <span className={styles.pulseDot} aria-hidden="true" />
              AI-powered team matching
            </span>

            <h1 className={`${styles.title} ${styles.enter}`} style={{ ["--d" as string]: "80ms" }}>
              One platform
              <br />
              to <RotatingWord /> and
              <br />
              <span className={styles.accent}>Sync</span> it all.
            </h1>

            <p className={`${styles.subtitle} ${styles.enter}`} style={{ ["--d" as string]: "160ms" }}>
              Forget endless searching. InnoSync matches students and innovators with the right projects and
              the right teammates. The perfect match is one sync away.
            </p>

            <div className={`${styles.ctas} ${styles.enter}`} style={{ ["--d" as string]: "240ms" }}>
              <button className={styles.primaryCta} onClick={handleGetStarted}>
                {loggedIn ? "Browse projects" : "Get started"}
                <span className={styles.ctaArrow} aria-hidden="true">→</span>
              </button>
              <Link className={styles.secondaryCta} href="/components/about">
                Learn more
              </Link>
            </div>

            {/* Real numbers only: the row appears once the live stats arrive from the API. */}
            {stats && (
              <div className={`${styles.social} ${styles.enter}`}>
                <div className={styles.avatarStack} aria-hidden="true">
                  {people.slice(0, 5).map((p, i) => (
                    <Avatar key={p.name + i} name={p.name} size={38} />
                  ))}
                </div>
                <span className={styles.socialText}>
                  <strong>{stats.talents} talents</strong> across {stats.roles} roles, ready to sync
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroRight}>
            <div className={styles.illustrationWrap}>
              <Image
                src="/landing_page.svg"
                alt="People collaborating on a project"
                className={styles.illustration}
                width={620}
                height={620}
                priority
              />

              {/* Floating UI cards: an at-a-glance preview of what the product does. */}
              <div className={`${styles.floatCard} ${styles.cardMatch}`}>
                <div className={styles.cardHead}>
                  <span className={styles.cardIcon} aria-hidden="true">⚡</span>
                  <div>
                    <div className={styles.cardTitle}>Team match found</div>
                    <div className={styles.cardSub}>Quick Sync · 4/4 roles filled</div>
                  </div>
                </div>
                <div className={styles.cardPeople}>
                  {(featured.length ? featured : [
                    { name: "Priya Nair", position: "Backend Developer" },
                    { name: "Lena Fischer", position: "Frontend Developer" },
                    { name: "Mei Tanaka", position: "UI/UX Designer" },
                  ]).map((p) => (
                    <div key={p.name} className={styles.cardPerson}>
                      <Avatar name={p.name} size={28} />
                      <div className={styles.cardPersonText}>
                        <span>{p.name}</span>
                        <small>{p.position}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.meter} aria-hidden="true">
                  <span className={styles.meterFill} />
                </div>
              </div>

              <div className={`${styles.floatCard} ${styles.cardInvite}`}>
                <span className={styles.cardIcon} aria-hidden="true">✉</span>
                <div>
                  <div className={styles.cardTitle}>New invitation</div>
                  <div className={styles.cardSub}>Product Manager · Hackathon</div>
                </div>
              </div>

              <div className={`${styles.floatCard} ${styles.cardSkills}`}>
                {skills.slice(0, 4).map((s) => (
                  <span key={s} className={styles.chip}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.trusted}>
          <span>Built at</span>
          <Image src="/innopolis_logo_vector.svg" alt="Innopolis University" width={140} height={38} />
        </div>
      </section>

      {/* ───────────── Skills ticker ───────────── */}
      <section className={styles.ticker} aria-label="Skills on InnoSync">
        {[rowA, rowB].map((row, r) => (
          <div key={r} className={`${styles.tickerRow} ${r === 1 ? styles.tickerReverse : ""}`}>
            <div className={styles.tickerTrack}>
              {/* Duplicated once so the loop is seamless. */}
              {[...row, ...row].map((s, i) => (
                <span key={s + i} className={styles.tickerItem} aria-hidden={i >= row.length}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ───────────── Features ───────────── */}
      <section className={styles.section}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.kicker}>Why InnoSync</span>
          <h2 className={styles.h2}>Everything you need to form a great team</h2>
          <p className={styles.lead}>From the first idea to a full team, without spreadsheets or endless group chats.</p>
        </Reveal>
        <div className={styles.features}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon>{f.icon}</Icon>
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureText}>{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section className={`${styles.section} ${styles.sectionTinted}`}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.kicker}>How it works</span>
          <h2 className={styles.h2}>Three steps from idea to team</h2>
        </Reveal>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 140} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ───────────── Live numbers ───────────── */}
      <section className={styles.section}>
        <Reveal className={styles.statsBand}>
          <div className={styles.stat}>
            <CountUp value={stats?.talents ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Talents on the platform</span>
          </div>
          <div className={styles.stat}>
            <CountUp value={stats?.skills ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Distinct skills</span>
          </div>
          <div className={styles.stat}>
            <CountUp value={stats?.roles ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Roles represented</span>
          </div>
          <div className={styles.stat}>
            <CountUp value={4} className={styles.statNum} />
            <span className={styles.statLabel}>Services working together</span>
          </div>
        </Reveal>
        <p className={styles.liveNote}>
          <span className={styles.pulseDot} aria-hidden="true" /> Live from the InnoSync API
        </p>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className={styles.section}>
        <Reveal className={styles.ctaBand}>
          <h2 className={styles.ctaTitle}>Ready to find your team?</h2>
          <p className={styles.ctaText}>Create a profile in a minute and let Quick Sync do the searching.</p>
          <div className={styles.ctaRow}>
            <button className={styles.ctaLight} onClick={handleGetStarted}>
              {loggedIn ? "Browse projects" : "Create your profile"}
            </button>
            <Link className={styles.ctaGhost} href="/components/talent">
              Explore talent
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <span>
          <strong className={styles.footerBrand}>Inno<span>Sync</span></strong> · Capstone project, Innopolis University 2025
        </span>
        <nav className={styles.footerLinks} aria-label="Footer">
          <Link href="/components/projects">Projects</Link>
          <Link href="/components/talent">Talent</Link>
          <Link href="/components/about">About</Link>
        </nav>
      </footer>
    </div>
  );
};

export default HomePage;
