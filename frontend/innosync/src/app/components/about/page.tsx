"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./AboutPage.module.css";
import Reveal from "../common/Reveal";
import ScrollProgress from "../common/ScrollProgress";
import CountUp from "../common/CountUp";
import useLiveStats from "../common/useLiveStats";

/* Small line icons, drawn in the same 24px grid so every badge looks alike. */
const ICONS: Record<string, React.ReactNode> = {
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  match: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6M11 8v6" /></>,
  synergy: <><circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" /></>,
  rank: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></>,
  web: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M8 21h8" /></>,
  api: <><path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  ml: <><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></>,
  db: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const PIPELINE = [
  { icon: "profile", title: "Profiles", text: "Skills, level, education and work history from every talent.", tag: "Input" },
  { icon: "match", title: "Skill matching", text: "TF-IDF vectors and cosine similarity rank candidates for each role.", tag: "TF-IDF" },
  { icon: "synergy", title: "Synergy scoring", text: "Shared skills and experience balance measure how well people fit together.", tag: "Team fit" },
  { icon: "rank", title: "ML ranking", text: "A scikit-learn team-quality model picks the best of several candidate teams.", tag: "scikit-learn" },
];

type StackItem = { icon: string; layer: string; name: string; detail: string; host: string };

const STACK: Record<"web" | "api" | "ml" | "db", StackItem> = {
  web: { icon: "web", layer: "Frontend", name: "Next.js 15 · React 19", detail: "TypeScript, App Router, CSS Modules", host: "Vercel" },
  api: { icon: "api", layer: "Backend API", name: "Spring Boot 3 · Java 21", detail: "Spring Security, JWT, JPA / Hibernate", host: "Render · Docker" },
  ml: { icon: "ml", layer: "ML service", name: "FastAPI · Python 3.11", detail: "scikit-learn, pandas, NumPy", host: "Render · Docker" },
  db: { icon: "db", layer: "Database", name: "PostgreSQL", detail: "Serverless Postgres with branching", host: "Neon" },
};

function StackCard({ item, core = false }: { item: StackItem; core?: boolean }) {
  return (
    <div className={`${styles.stackCard} ${core ? styles.stackCore : ""}`}>
      <span className={styles.iconBadge}><Icon name={item.icon} /></span>
      <span className={styles.stackLayer}>{item.layer}</span>
      <h3 className={styles.stackName}>{item.name}</h3>
      <p className={styles.stackDetail}>{item.detail}</p>
      <span className={styles.stackHost}>{item.host}</span>
    </div>
  );
}

const VALUES = [
  { title: "Skills over CVs", text: "We match on what people can actually do, not on where they happened to study or work." },
  { title: "Teams, not individuals", text: "Great projects come from complementary people. We score the team as a whole." },
  { title: "Open to everyone", text: "Students, researchers and early-career builders get the same visibility as veterans." },
];

export default function AboutPage() {
  const stats = useLiveStats();

  return (
    <div className={`scroll-page ${styles.page}`}>
      <ScrollProgress />
      {/* ───── Hero ───── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <Reveal className={styles.heroInner}>
          <span className={styles.kicker}>About InnoSync</span>
          <h1 className={styles.title}>
            We help great people <span className={styles.accent}>find their team</span>.
          </h1>
          <p className={styles.lead}>
            InnoSync is a talent-matching and collaboration platform for university communities and innovation hubs.
            Project creators describe the roles they need; our AI proposes the team that fits best, and everyone gets
            to work on something that matters.
          </p>
        </Reveal>

        <Reveal delay={150} className={styles.stats}>
          <div className={styles.stat}>
            <CountUp value={stats?.talents ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Talents</span>
          </div>
          <div className={styles.stat}>
            <CountUp value={stats?.skills ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Skills</span>
          </div>
          <div className={styles.stat}>
            <CountUp value={stats?.roles ?? null} className={styles.statNum} />
            <span className={styles.statLabel}>Roles</span>
          </div>
        </Reveal>
      </section>

      {/* ───── Mission & vision ───── */}
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <Reveal className={`${styles.card} ${styles.cardGreen}`}>
            <span className={styles.cardTag}>Our mission</span>
            <h2 className={styles.cardTitle}>Close the gap between talent and great projects</h2>
            <p className={styles.cardText}>
              Finding teammates usually means group chats, spreadsheets and luck. We replace that with a single place
              to show what you can do, discover projects, and get matched with people whose skills complement yours.
            </p>
          </Reveal>
          <Reveal delay={120} className={styles.card}>
            <span className={styles.cardTag}>Our vision</span>
            <h2 className={styles.cardTitle}>Collaboration without borders</h2>
            <p className={styles.cardText}>
              A world where every student and early-career builder can find meaningful work, and where innovation
              thrives through diverse teams that would never have met otherwise.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───── How Quick Sync works ───── */}
      <section className={`${styles.section} ${styles.tinted}`}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.kicker}>Under the hood</span>
          <h2 className={styles.h2}>How Quick Sync builds a team</h2>
          <p className={styles.sectionLead}>
            When a recruiter opens Quick Sync, the ML service pulls the project&apos;s roles and every profile, then runs
            a four-stage pipeline that returns a ranked team in seconds.
          </p>
        </Reveal>
        <div className={styles.pipeline}>
          {/* The track joins the four stage badges; a pulse runs along it like data moving through. */}
          <span className={styles.pipeTrack} aria-hidden="true"><span className={styles.pipePulse} /></span>
          <ol className={styles.pipeSteps}>
            {PIPELINE.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 120} className={styles.pipeStep}>
                <span className={styles.pipeDot}><Icon name={p.icon} /></span>
                <div className={styles.pipeCard}>
                  <span className={styles.pipeIndex}>Stage {i + 1}</span>
                  <h3 className={styles.pipeTitle}>{p.title}</h3>
                  <p className={styles.pipeText}>{p.text}</p>
                  <span className={styles.chip}>{p.tag}</span>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───── Architecture & stack ───── */}
      <section className={styles.section}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.kicker}>Built with</span>
          <h2 className={styles.h2}>Four services, one product</h2>
          <p className={styles.sectionLead}>
            A modern, containerised stack: each service deploys on its own and talks to the others over HTTPS.
          </p>
        </Reveal>

        {/* Architecture: the cards are the diagram. Browser ↔ API ↔ ML across the top, the database under the API. */}
        <div className={styles.arch}>
          <Reveal className={styles.archCell}><StackCard item={STACK.web} /></Reveal>
          <Reveal className={styles.archLink} delay={120}><span aria-hidden="true">HTTPS</span></Reveal>
          <Reveal className={styles.archCell} delay={200}><StackCard item={STACK.api} core /></Reveal>
          <Reveal className={styles.archLink} delay={320}><span aria-hidden="true">REST</span></Reveal>
          <Reveal className={styles.archCell} delay={400}><StackCard item={STACK.ml} /></Reveal>
          <Reveal className={styles.archDown} delay={500}><span aria-hidden="true">JDBC</span></Reveal>
          <Reveal className={styles.archDb} delay={600}><StackCard item={STACK.db} /></Reveal>
        </div>
      </section>

      {/* ───── Values ───── */}
      <section className={`${styles.section} ${styles.tinted}`}>
        <Reveal className={styles.sectionHead}>
          <span className={styles.kicker}>What we believe</span>
          <h2 className={styles.h2}>Our values</h2>
        </Reveal>
        <div className={styles.values}>
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 110} className={styles.valueCard}>
              <span className={styles.iconBadge} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueText}>{v.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───── Origin + CTA ───── */}
      <section className={styles.section}>
        <Reveal className={styles.origin}>
          <Image src="/innopolis_logo_vector.svg" alt="Innopolis University" width={170} height={46} />
          <p>
            InnoSync started as a Summer 2025 capstone project at Innopolis University, built by a student team
            covering frontend, backend, machine learning and DevOps.
          </p>
          <div className={styles.originCtas}>
            <Link href="/authentication/signup" className={styles.primaryCta}>Join InnoSync</Link>
            <Link href="/components/projects" className={styles.secondaryCta}>Browse projects</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
