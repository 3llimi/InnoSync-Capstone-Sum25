"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./AboutPage.module.css";
import Reveal from "../common/Reveal";
import CountUp from "../common/CountUp";
import useLiveStats from "../common/useLiveStats";

const PIPELINE = [
  { title: "Profiles", text: "Skills, level, education and work history from every talent." },
  { title: "Skill matching", text: "TF-IDF vectors + cosine similarity rank candidates for each role." },
  { title: "Synergy scoring", text: "Shared skills and experience balance measure how well people fit together." },
  { title: "ML ranking", text: "A scikit-learn team-quality model picks the best of several candidate teams." },
];

const STACK = [
  { layer: "Frontend", name: "Next.js 15 · React 19", detail: "TypeScript, App Router, CSS Modules", host: "Vercel" },
  { layer: "Backend API", name: "Spring Boot 3 · Java 21", detail: "Spring Security, JWT, JPA / Hibernate", host: "Render (Docker)" },
  { layer: "ML service", name: "FastAPI · Python 3.11", detail: "scikit-learn, pandas, NumPy", host: "Render (Docker)" },
  { layer: "Database", name: "PostgreSQL", detail: "Serverless Postgres with branching", host: "Neon" },
];

const VALUES = [
  { title: "Skills over CVs", text: "We match on what people can actually do, not on where they happened to study or work." },
  { title: "Teams, not individuals", text: "Great projects come from complementary people. We score the team as a whole." },
  { title: "Open to everyone", text: "Students, researchers and early-career builders get the same visibility as veterans." },
];

export default function AboutPage() {
  const stats = useLiveStats();

  return (
    <div className={`scroll-page ${styles.page}`}>
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
        <ol className={styles.pipeline}>
          {PIPELINE.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 120} className={styles.pipeStep}>
              <span className={styles.pipeNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.pipeTitle}>{p.title}</h3>
              <p className={styles.pipeText}>{p.text}</p>
            </Reveal>
          ))}
        </ol>
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

        <Reveal className={styles.arch} delay={80}>
          <div className={styles.archNode}>Next.js<small>Frontend</small></div>
          <span className={styles.archLink} aria-hidden="true" />
          <div className={`${styles.archNode} ${styles.archCore}`}>Spring Boot<small>REST API · JWT</small></div>
          <span className={styles.archLink} aria-hidden="true" />
          <div className={styles.archNode}>FastAPI<small>ML service</small></div>
          <div className={styles.archDb}>
            <span className={styles.archDown} aria-hidden="true" />
            <div className={styles.archNode}>PostgreSQL<small>Neon</small></div>
          </div>
        </Reveal>

        <div className={styles.stack}>
          {STACK.map((s, i) => (
            <Reveal key={s.layer} delay={i * 90} className={styles.stackCard}>
              <span className={styles.stackLayer}>{s.layer}</span>
              <h3 className={styles.stackName}>{s.name}</h3>
              <p className={styles.stackDetail}>{s.detail}</p>
              <span className={styles.stackHost}>Hosted on {s.host}</span>
            </Reveal>
          ))}
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
              <span className={styles.valueMark} aria-hidden="true">✓</span>
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
