// src/app/authentication/login/page.tsx

"use client";
import styles from "../page.module.css";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import BodyToasts from "../../components/common/BodyToasts";
import { readErrorMessage } from "../../components/common/readErrorMessage";
import AuthField from "../AuthField";

const TOAST = {
  position: "top-center" as const,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored" as const,
};

// Optional one-click demo login for portfolio visitors. Only shown when both variables are set
// (e.g. in Vercel), so no credentials end up in the bundle unless you choose to publish them.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || "";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "";
// Optional second demo account (for trying notifications between two people). Shares the password unless set.
const DEMO2_EMAIL = process.env.NEXT_PUBLIC_DEMO2_EMAIL || "";
const DEMO2_PASSWORD = process.env.NEXT_PUBLIC_DEMO2_PASSWORD || DEMO_PASSWORD;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);
  const [shake, setShake] = useState(0);

  // Free hosting can take up to a minute to wake up: tell people it's working, not frozen.
  useEffect(() => {
    if (!submitting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const login = async (loginEmail: string, loginPassword: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const errorMsg = await readErrorMessage(res, "Login failed. Please check your credentials.");
        setShake((n) => n + 1);
        toast.error(errorMsg, { ...TOAST, autoClose: 4000 });
        return;
      }

      const data = await res.json();
      if (data.accessToken) localStorage.setItem("token", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      toast.success("Login successful!", { ...TOAST, autoClose: 2000 });

      // Trigger navbar refresh and auth state change
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      window.dispatchEvent(new CustomEvent("authStateChanged"));

      router.push("/components/home");
    } catch (err) {
      toast.error("Network error. Please try again later.", { ...TOAST, autoClose: 4000 });
      console.error("Fetch error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = { email: email.trim() === "", password: password.trim() === "" };
    setErrors(newErrors);
    if (newErrors.email || newErrors.password) {
      setShake((n) => n + 1);
      return;
    }
    await login(email, password);
  };

  const handleDemo = (demoEmail = DEMO_EMAIL, demoPassword = DEMO_PASSWORD) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({ email: false, password: false });
    login(demoEmail, demoPassword);
  };

  return (
    <div className={styles.authCard}>
      <Link href="/" className={styles.back}>
        <span aria-hidden="true">←</span> Back to home
      </Link>

      <header className={styles.authHead}>
        <span className={styles.kicker}>Welcome back</span>
        <h1 className={styles.authTitle}>Log in to <span className={styles.accent}>InnoSync</span></h1>
        <p className={styles.authSub}>
          New here? <Link href="/authentication/signup" className={styles.inlineLink}>Create an account</Link>
        </p>
      </header>

      {DEMO_EMAIL && DEMO_PASSWORD && (
        <>
          <button type="button" className={styles.demoBtn} onClick={() => handleDemo()} disabled={submitting}>
            <span className={styles.demoIcon} aria-hidden="true">✦</span>
            <span>
              <b>Explore with the demo account</b>
              <small>One click, no sign-up needed</small>
            </span>
            <span className={styles.demoArrow} aria-hidden="true">→</span>
          </button>
          {DEMO2_EMAIL && DEMO2_PASSWORD && (
            <button type="button" className={styles.demoAltBtn} onClick={() => handleDemo(DEMO2_EMAIL, DEMO2_PASSWORD)} disabled={submitting}>
              Or try the second demo account →
            </button>
          )}
          <div className={styles.divider}><span>or log in with email</span></div>
        </>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div key={shake} className={`${styles.fields} ${shake ? styles.shake : ""}`}>
          <AuthField
            label="Email"
            icon="mail"
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            error={errors.email && "Please enter your email."}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: false }));
            }}
          />
          <AuthField
            label="Password"
            icon="lock"
            type="password"
            placeholder="Your password"
            value={password}
            autoComplete="current-password"
            error={errors.password && "Please enter your password."}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: false }));
            }}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <><span className="spinner" aria-hidden="true" /> Logging in...</>
          ) : (
            <>Log in <span className={styles.submitArrow} aria-hidden="true">→</span></>
          )}
        </button>
        {submitting && slow && (
          <p className={styles.slowHint} role="status">
            Waking up the server. The first request can take up to a minute.
          </p>
        )}
      </form>
      {/* Portalled to <body>: the form column is its own stacking context, so the green panel would cover it. */}
      <BodyToasts label="Notification messages" />
    </div>
  );
}
