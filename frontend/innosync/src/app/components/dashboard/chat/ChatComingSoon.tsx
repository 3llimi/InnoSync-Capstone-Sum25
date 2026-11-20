"use client";
import Link from "next/link";
import styles from "./ChatComingSoon.module.css";

/* A short, looping mock conversation: shows what team chat will feel like. */
const MESSAGES = [
  { who: "Amina", side: "left", text: "Pushed the new matching endpoint 🚀" },
  { who: "You", side: "right", text: "Nice! Wiring it into the dashboard now" },
  { who: "Lev", side: "left", text: "I'll review the PR after standup" },
];

const FEATURES = [
  { title: "Project rooms", text: "A channel for every project, created when your team forms." },
  { title: "Direct messages", text: "Talk to applicants before you send an invitation." },
  { title: "Shared files", text: "Specs, designs and resumes in one place." },
];

export default function ChatComingSoon() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Animated preview */}
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.glow} />
          <div className={styles.window}>
            <div className={styles.windowBar}>
              <span className={styles.room}># innosync-core</span>
              <span className={styles.online}><i /> 3 online</span>
            </div>
            <div className={styles.thread}>
              {MESSAGES.map((m, i) => (
                <div
                  key={i}
                  className={`${styles.msg} ${m.side === "right" ? styles.msgRight : ""}`}
                  style={{ ["--i" as string]: i }}
                >
                  {m.side === "left" && <span className={styles.avatar}>{m.who[0]}</span>}
                  <div className={styles.bubble}>
                    {m.side === "left" && <b>{m.who}</b>}
                    {m.text}
                  </div>
                </div>
              ))}
              <div className={styles.typing} style={{ ["--i" as string]: MESSAGES.length }}>
                <span className={styles.avatar}>A</span>
                <div className={styles.typingBubble}>
                  <i /><i /><i />
                </div>
              </div>
            </div>
            <div className={styles.composer}>
              <span>Message #innosync-core</span>
              <span className={styles.send}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className={styles.copy}>
          <span className={styles.badge}><span className={styles.badgeDot} /> Coming soon</span>
          <h1 className={styles.title}>
            Team chat is <span className={styles.accent}>on its way</span>
          </h1>
          <p className={styles.lead}>
            Soon you&apos;ll talk to your teammates and applicants right inside InnoSync, with no group chats to juggle.
            Until then, invitations and applications keep everyone in the loop.
          </p>

          <ul className={styles.features}>
            {FEATURES.map((f, i) => (
              <li key={f.title} className={styles.feature} style={{ ["--i" as string]: i }}>
                <span className={styles.check} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                </span>
                <span>
                  <b>{f.title}</b>
                  <small>{f.text}</small>
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link href="/dashboard/invitations" className={styles.primary}>Open invitations</Link>
            <Link href="/dashboard/projects" className={styles.ghost}>Go to projects</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
